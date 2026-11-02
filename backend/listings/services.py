"""Business rules for service listings."""

from django.utils import timezone

from accounts.models import ProviderProfile
from accounts.services import refresh_provider_status
from core.exceptions import BusinessRuleError

from .models import CategoryPricing, Listing, PricingUnit

DESCRIPTION_MIN_TO_PUBLISH = 80


def pricing_for(category, unit):
    return CategoryPricing.objects.filter(category=category, unit=unit).prefetch_related("estimates").first()


def _check_price(category, unit, price):
    """SR-F-PRC-05: any price inside the category limits, above or below the estimate."""
    pricing = pricing_for(category, unit)
    if pricing and not pricing.min_price <= price <= pricing.max_price:
        raise BusinessRuleError(
            f"{category.name} prices {PricingUnit(unit).label} must be between "
            f"KES {pricing.min_price:,} and KES {pricing.max_price:,}.",
            "price_out_of_range",
        )


def create_listing(profile, **data):
    if not data["category"].is_active:
        raise BusinessRuleError("This category isn't available.")
    _check_price(data["category"], data["pricing_unit"], data["price"])
    listing = Listing.objects.create(provider=profile, **data)
    refresh_provider_status(profile)  # the first listing completes checklist step (e)
    return listing


def update_listing(listing, **data):
    if listing.status == Listing.Status.REMOVED:
        raise BusinessRuleError("This listing was removed and can't be edited.")
    for field, value in data.items():
        setattr(listing, field, value)
    _check_price(listing.category, listing.pricing_unit, listing.price)
    if listing.status == Listing.Status.PUBLISHED:
        # A live listing must stay publishable; pause it first to make bigger changes.
        missing = [check["label"] for check in publish_checks(listing) if not check["done"]]
        if missing:
            raise BusinessRuleError("This listing is live, so it still needs: " + "; ".join(missing) + ".", "not_ready_to_publish")
    listing.save()  # a new price applies to new booking requests only (SR-F-LST-04)
    return listing


def publish_checks(listing):
    """The "Before you publish" list shown in the listing editor."""
    pricing = pricing_for(listing.category, listing.pricing_unit)
    profile = listing.provider
    checks = [
        ("details", "Title and category", bool(listing.title.strip()) and listing.category.is_active),
        ("description", f"Description (min {DESCRIPTION_MIN_TO_PUBLISH} characters)", len(listing.description.strip()) >= DESCRIPTION_MIN_TO_PUBLISH),
        ("area", "Base location", bool(listing.area_name.strip())),
        ("price", "Price within category limits", pricing is not None and pricing.min_price <= listing.price <= pricing.max_price),
        ("provider", "Provider steps complete", profile.status == ProviderProfile.Status.ACTIVE and profile.account.is_active),
    ]
    if listing.category.requires_badge:
        # Badges aren't built yet, so nobody can publish in these categories (SR-F-LST-05).
        checks.append(("badge", "Verified badge (required in this category)", False))
    return [{"key": key, "label": label, "done": done} for key, label, done in checks]


def publish_listing(listing):
    if listing.status == Listing.Status.REMOVED:
        raise BusinessRuleError("This listing was removed and can't be published.")
    if listing.status == Listing.Status.PUBLISHED:
        return listing
    refresh_provider_status(listing.provider)
    missing = [check["label"] for check in publish_checks(listing) if not check["done"]]
    if missing:
        raise BusinessRuleError("Before you publish: " + "; ".join(missing) + ".", "not_ready_to_publish")
    listing.status = Listing.Status.PUBLISHED
    listing.published_at = timezone.now()
    listing.save(update_fields=["status", "published_at", "updated_at"])
    return listing


def pause_listing(listing):
    if listing.status != Listing.Status.PUBLISHED:
        raise BusinessRuleError("Only a published listing can be paused.")
    listing.status = Listing.Status.PAUSED
    listing.save(update_fields=["status", "updated_at"])
    return listing


def remove_listing(listing):
    """Listings are never deleted: future bookings will point at them."""
    listing.status = Listing.Status.REMOVED
    listing.save(update_fields=["status", "updated_at"])
    return listing
