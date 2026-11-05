# Kazi Connect

A trusted service marketplace for MMU students and their neighbours: clients hire verified providers, pay by M-Pesa, and the money is held until the job is done.

| Document | What it covers |
|---|---|
| [Kazi_Connect_SRS.docx](./Kazi_Connect_SRS.docx) | Requirements (authoritative) |
| [Kazi_Connect_SDD.md](./Kazi_Connect_SDD.md) | Architecture and technology choices |
| [Kazi_Connect_Database_Design.md](./Kazi_Connect_Database_Design.md) | Tables, constraints, security, retention |
| [Kazi_Connect_OOAD_Diagrams.md](./Kazi_Connect_OOAD_Diagrams.md) | Use case, class, sequence, state and activity diagrams |
| [system_evolution.md](./system_evolution.md) | Every place the built system differs from the SRS and SDD, and why |

## What the MVP does

- Sign up with email and password (Supabase Auth) and a Kenyan phone number, then confirm the email. SMS verification of the phone is built but switched off until an SMS provider is chosen ([E-02](./system_evolution.md#e-02-sms-phone-verification-is-switched-off)); set `PHONE_VERIFICATION_ENABLED=True` in `backend/.env` to turn it on.
- Every account starts as a client. Clients can **post a job** that providers browse on a job board.
- Clients can **request a booking** from a published listing (date, time, length, place, notes, after accepting the job rules and provider terms). The provider accepts or declines within 24 hours; either side can cancel an accepted booking before payment.
- Clients can upgrade to a **provider** (Student or General) through a five-step checklist, then create and publish **service listings** with a price estimate and commission preview.
- Admins (Django Admin) manage categories, prices, commission rates, accounts, listings and job posts.

Not built yet: paying for a booking (M-Pesa) and everything after it (start, delivery, release), booking from a job post, chat, reviews, badges, disputes, location search. See the design documents for the plan.

## Run it locally

You need Python 3.11+, Node 20+, and access to the Supabase project.

### Backend (Django API on port 8000)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows; on macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # then fill in SECRET_KEY, DATABASE_URL, SUPABASE_URL
python manage.py migrate
python manage.py seed_demo        # optional: placeholder commission rates and category prices
python manage.py createsuperuser  # your Django Admin login
python manage.py runserver
```

Emails (and SMS codes, when phone verification is on) are printed in this terminal during development.

Unanswered booking requests expire and unpaid bookings are cancelled by `python manage.py run_booking_deadlines`. In production a scheduler runs it every 5 minutes (SDD D-04). Locally you don't need it: the API applies the deadlines to your own bookings whenever you open them.

### Frontend (React on port 5173)

```bash
cd frontend
npm install
copy .env.example .env.local      # then add the Supabase publishable key
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` requests to Django.

### Supabase settings to check

In the Supabase dashboard for the project:

1. **Authentication > Sign In / Providers > Email:** keep **Confirm email** on. Django treats a Supabase session as proof the email is verified.
2. **Authentication > URL Configuration:** add `http://localhost:5173/**` to the redirect URLs, so the confirmation link returns to the app.
3. **Authentication > Emails:** Supabase's built-in email sender is heavily rate-limited. For more than a few test sign-ups, set up custom SMTP.
4. **Project Settings > Data API:** Django is the only intended path to the data, so turning the Data API off is recommended (database design, section 7.1).

### Tests

```bash
cd backend
set DATABASE_URL=sqlite:///test.sqlite3   # macOS/Linux: export DATABASE_URL=sqlite:///test.sqlite3
python manage.py test

cd ../frontend
npm run build                              # type-checks and builds
```
