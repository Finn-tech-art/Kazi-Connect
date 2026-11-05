# Kazi Connect system evolution

This log records every place where the built system differs from the two baseline documents:

- the Software Requirements Specification, [Kazi_Connect_SRS.docx](./Kazi_Connect_SRS.docx) (v1.0), and
- the Software Design Document, [Kazi_Connect_SDD.md](./Kazi_Connect_SDD.md).

The SRS stays authoritative. Each entry says what the baseline requires, what we built instead, why, what it puts at risk, and what closes the entry: either approving an SRS or SDD change, or bringing the system back in line.

Features that are simply not built yet (payments, chat, reviews, map search and so on) are not deviations and are not listed here; see "What the MVP does" in the [README](./README.md). They appear here only where they block a requirement that the MVP otherwise meets.

## Status values

| Status | Meaning |
|---|---|
| **Needs approval** | Built and intended to stay. The SRS or SDD must be updated by the project group and supervisor. |
| **Temporary** | Built as a stopgap. The system must return to the baseline before the pilot or before the feature it affects goes live. |
| **Open** | The baseline contradicts itself or leaves the point undecided. We picked one reading; a decision is needed. |
| **Design change** | Differs from the SDD or the database design only. No requirement changes. |

## Summary

| ID | Change | Affects | Status |
|---|---|---|---|
| [E-01](#e-01-clients-can-post-jobs-change-request-cr-01) | Clients can post jobs; providers browse a job board | SRS scope (new feature) | Needs approval |
| [E-02](#e-02-sms-phone-verification-is-switched-off) | SMS phone verification is switched off | SR-F-ACC-03, 04, 06, 08(b); US-01; BR-F-02 | Temporary |
| [E-03](#e-03-providers-activate-without-a-profile-photo) | Providers activate without a profile photo | SR-F-ACC-08(a) | Temporary |
| [E-04](#e-04-a-client-cannot-withdraw-an-unanswered-booking-request) | A client can't withdraw an unanswered booking request | SR-F-BKG-06, 07(a); SRS Figure 5 | Open |
| [E-05](#e-05-booking-deadlines-run-from-a-sweep-command-and-on-read) | Booking deadlines run from a sweep command, and on read | SDD D-04; SR-F-BKG-03, 04 | Design change |
| [E-06](#e-06-booking-table-adjustments) | Booking table: unit price × quantity; one check moved to code | Database design 4.5 | Design change |
| [E-07](#e-07-supabase-auth-settings-must-be-set-to-match-the-srs) | Supabase Auth settings must be set to match the SRS | SR-F-ACC-02, 05, 06 | Temporary |
| [E-08](#e-08-automated-tests-run-on-sqlite) | Automated tests run on SQLite, not PostgreSQL | SDD (PostgreSQL) | Design change |

---

## E-01. Clients can post jobs (change request CR-01)

**Date:** 1 November 2026 · **Status:** Needs approval · **Affects:** SRS scope, SDD decision D-08

**Baseline:** in SRS v1.0, clients find providers only by browsing and searching listings, then booking one. There is no way for a client to describe a job and let providers come to them.

**What we built:**

- Clients post a job with a category, title, description, budget range, approximate area (or remote) and an optional preferred date. They must accept the category's job rules first.
- Posts can be edited while open and closed by the client. They expire after 30 days (`job_post_lifetime_days` in platform settings).
- Active providers browse open posts on a **job board**, filtered by category. A provider never sees their own posts there.
- Providers see the client's first name, category label and join date, never contact details.

**Why:** some clients know what they need but not whom to ask. It also matches the Upwork-style interface chosen for the project.

**Risks:** a job agreed through a post must still go through the protected booking flow (held payment, disputes, reviews). Until providers can respond inside the platform, there is a temptation to arrange the work off-platform (BRU-16).

**To close:**

1. The project group and supervisor approve CR-01, and the SRS gains the user stories and entities described in section 11 of the [database design](./Kazi_Connect_Database_Design.md#11-change-request-cr-01-client-job-posts).
2. Decide how a provider responds to a post: a priced offer or a chat message (SDD D-08, database design DQ-4). An accepted response must create a booking.

---

## E-02. SMS phone verification is switched off

**Date:** 5 November 2026 · **Status:** Temporary · **Affects:** SR-F-ACC-03, SR-F-ACC-04, SR-F-ACC-06, SR-F-ACC-08(b), US-01, BR-F-02, SRS assumption "an SMS gateway with a free or test tier is available"

**Baseline:**

- SR-F-ACC-03: the phone number is verified with a 6-digit SMS code (5-minute expiry, 3 attempts, at most 5 codes per number per hour).
- US-01 and BR-F-02: an account becomes active only when both the email and the phone are verified.
- SR-F-ACC-08(b): a provider's M-Pesa payout number is verified by SMS code.

**What we built:**

- One setting, `PHONE_VERIFICATION_ENABLED` in `backend/.env`, defaults to `False`.
- While it is off:
  - An account is **active as soon as it is created**. Supabase only issues a session after the email link is confirmed, so the email is still verified.
  - Accounts already waiting for a phone code are activated the next time they load the app.
  - The phone number is stored but marked unverified (`phone_verified: false`).
  - The provider's payout number is **saved as typed**, and that completes checklist step (b), now labelled "Add your M-Pesa payout number".
  - The SMS code endpoints answer with error code `phone_verification_off`.
  - A phone number already entered by any account can't be used again. With verification on, only verified numbers count.
- The SMS code feature is kept in full: code hashing, expiry, attempt limits, rate limits, endpoints and screens. It runs again when the setting is `True`, and its tests run with the setting on.
- The app reads `phone_verification_enabled` from the account data and shows or hides the code screens to match.

**Why:** we don't have an SMS provider yet. Signing up with one takes time and money, and it was blocking everyone from testing the rest of the system.

**Risks:**

- **Payouts can go to the wrong number.** A typo in the payout number, or a number the provider doesn't own, would send earnings to someone else. M-Pesa payouts aren't built yet, so nothing can be lost today. **SMS verification must be back on before the first real payout.**
- **Fake or borrowed numbers.** Anyone can register with any Kenyan number, so one person can open several accounts. That weakens SR-F-ACC-04 and the trust the platform depends on.
- **Number squatting.** Because unverified numbers count as taken, someone could block another person's number by typing it first. Support would have to resolve it.
- **No phone sign-in.** SR-F-ACC-06 allows sign-in with the phone number. That needs a verified number, so it waits for this entry to close.

**To close:**

1. Choose an SMS gateway that serves Kenyan numbers (for example Africa's Talking, which has a sandbox) and add a backend class for it in `backend/accounts/sms.py`. Set `SMS_BACKEND` to that class.
2. Set `PHONE_VERIFICATION_ENABLED=True`.
3. Decide what happens to accounts created while verification was off:
   - Their accounts stay active. They should be asked to verify their phone at their next sign-in.
   - Active providers keep their status, but they must verify their payout number before receiving any payout. This check belongs in the payout code when it is built.

---

## E-03. Providers activate without a profile photo

**Date:** 1 November 2026 · **Status:** Temporary · **Affects:** SR-F-ACC-08(a), SR-F-ACC-09, and the provider profile contents in SR-F-LST

**Baseline:** checklist step (a) requires a profile photo, bio and skills.

**What we built:** step (a) checks the bio and skills only. There is no photo upload anywhere yet.

**Why:** storing photos needs the file storage decision (SDD D-02), which also has to cover the identity documents for badges.

**Risks:** clients can't see who is coming to their home or hostel. That matters for trust and safety.

**To close:** settle D-02, add photo upload (and listing photos, up to 6 per SR-F-LST-02), then add the photo back to step (a). Decide whether providers activated without a photo must add one before taking new bookings.

---

## E-04. A client cannot withdraw an unanswered booking request

**Date:** 3 November 2026 · **Status:** Open · **Affects:** SR-F-BKG-06, SR-F-BKG-07(a), SRS Figure 5

**Baseline (contradictory):**

- SR-F-BKG-07(a): "either party may cancel before payment at no cost". That includes a request the provider hasn't answered yet.
- SR-F-BKG-06: bookings move "only through the states and transitions in Figure 5". Figure 5 has no move from Requested to Cancelled; only Accepted can be cancelled before payment.

**What we built:** we followed Figure 5. An unanswered request ends only when the provider accepts or declines, or when it expires after 24 hours. Once accepted, either party can cancel until it is paid.

**Why:** SR-F-BKG-06 is the stricter rule, and keeping to the diagram keeps every recorded state change valid.

**Risks:** a client who changes their mind has to wait up to 24 hours for the request to expire, and the provider may accept a job the client no longer wants.

**To close:** decide which requirement wins. If clients should be able to withdraw, add Requested → Cancelled to Figure 5. In the code it is a one-line change to `ALLOWED_TRANSITIONS` in `backend/bookings/services.py`, plus a "Withdraw request" button.

---

## E-05. Booking deadlines run from a sweep command, and on read

**Date:** 3 November 2026 · **Status:** Design change · **Affects:** SDD decision D-04 (scheduler), SR-F-BKG-03, SR-F-BKG-04

**Baseline:** the SDD leaves the scheduler open (D-04). It suggests short, recoverable periodic sweeps on Railway Cron, at least five minutes apart.

**What we built:**

- `python manage.py run_booking_deadlines` expires requests not answered within 24 hours and cancels accepted bookings not paid within 2 hours. It is safe to run any number of times. It is meant to run every 5 minutes.
- The API also applies the same deadlines to the signed-in user's own bookings whenever they list or open them, and before any accept, decline or cancel. So a user never sees, or acts on, a booking whose deadline has already passed, even if the sweep is late or hasn't run.

**Why:** there is no scheduler yet. Checking on read makes the deadlines exact for the people involved without one.

**Risks:** until the sweep is scheduled, a booking that nobody opens stays in its old state in the database and in Django Admin. Email reminders for deadlines (SR-F-NTF-02) will need the scheduler anyway.

**To close:** settle D-04 and schedule `run_booking_deadlines` every 5 minutes. Keep the on-read check: it costs little and covers late or missed runs.

---

## E-06. Booking table adjustments

**Date:** 3 November 2026 · **Status:** Design change · **Affects:** [database design](./Kazi_Connect_Database_Design.md) section 4.5

**Baseline:** the designed `bookings_booking` table has `price_kes`, `duration_minutes` and `quantity`, and a `CHECK` that the provider's account is not the client.

**What we built:**

- The price is stored as `unit_price_kes` × `quantity` = `price_kes`, copied from the listing when the request is made. `quantity` counts hours or sessions, and is always 1 for per-job prices. `duration_minutes` isn't needed.
- "A provider can't book their own listing" is checked in the booking service, not as a database `CHECK`. PostgreSQL `CHECK` constraints can't read another table.
- Two new platform settings hold the deadlines: `booking_response_hours` (24) and `payment_window_hours` (2).

**Why:** SR-F-BKG-01 asks for "quantity or duration"; for hourly and per-session prices these are the same thing. Keeping the unit price makes the total easy to explain to both parties.

**Risks:** none known.

**To close:** already reflected in the database design, section 4.5.

---

## E-07. Supabase Auth settings must be set to match the SRS

**Date:** 5 November 2026 · **Status:** Temporary · **Affects:** SR-F-ACC-02, SR-F-ACC-05, SR-F-ACC-06

**Baseline:**

- SR-F-ACC-02: the email link expires after 24 hours.
- SR-F-ACC-05: passwords have at least 8 characters, with letters and numbers.
- SR-F-ACC-06: sign-in locks for 15 minutes after 5 failed attempts.

**What we built:** Supabase Auth handles sign-up, the email link and sign-in (SDD), so these rules are mostly Supabase settings rather than our code. The password rule is checked in the sign-up form only, so a request sent straight to Supabase can bypass it. Supabase's defaults differ from the SRS (for example, the email link lifetime and the minimum password length), and Supabase has no per-account 15-minute lockout.

**Why:** we use Supabase Auth by design, and these settings haven't been checked yet.

**Risks:** weaker passwords than required, links that expire sooner than users expect, and no lockout against password guessing.

**To close:**

1. In the Supabase dashboard, set the email link (OTP) expiry to 24 hours and the password policy to at least 8 characters with letters and digits.
2. Decide how to meet the lockout rule: Supabase's built-in rate limits plus CAPTCHA, or a check in front of sign-in. Record the choice in the SDD.

---

## E-08. Automated tests run on SQLite

**Date:** 1 November 2026 · **Status:** Design change · **Affects:** SDD (PostgreSQL on Supabase), SR-NF-MNT

**Baseline:** the system runs on PostgreSQL hosted by Supabase.

**What we built:** the backend tests run on a local SQLite database (`DATABASE_URL=sqlite:///test.sqlite3`), so they are fast and don't touch the shared Supabase database. The app itself runs on Supabase PostgreSQL.

**Why:** tests that write to the shared development database would interfere with manual testing and with each other.

**Risks:** behaviour that only PostgreSQL has isn't tested: row locks (`select_for_update`, used for booking state changes), Row Level Security, and some constraint details. A bug in those areas would pass the tests.

**To close:** when continuous integration is set up, run the tests against a throwaway PostgreSQL database as well. Keep SQLite for quick local runs.

---

## Adding an entry

When a change makes the system differ from the SRS or SDD:

1. Add a row to the summary with the next number (E-09, E-10, …). Never reuse a number.
2. Add a section with the date, status, the requirement IDs it affects, and these headings: **Baseline**, **What we built**, **Why**, **Risks**, **To close**.
3. When an entry closes, keep it, and add a dated **Closed** line saying how: "SRS v1.1 updated" or "Back in line with the SRS in commit …".
