from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q

from accounts.models import ProviderProfile


class PricingUnit(models.TextChoices):
    PER_JOB = "per_job", "per job"
    PER_HOUR = "per_hour", "per hour"
    PER_SESSION = "per_session", "per session"


class ServiceCategory(models.Model):
    """A type of service with its job rules and risk settings (SR-F-ADM-04)."""

    name = models.CharField(max_length=60, unique=True)
    slug = models.SlugField(max_length=60, unique=True)
    description = models.CharField(max_length=200, blank=True)
    job_rules = models.TextField(help_text="Both parties accept these before a booking is confirmed (BRU-13).")
    is_higher_risk = models.BooleanField(default=False)
    requires_badge = models.BooleanField(default=False, help_text="Only providers with a verified badge may publish (SR-F-LST-05).")
    late_cancellation_fee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "service categories"
        constraints = [
            models.CheckConstraint(
                condition=Q(late_cancellation_fee_percent__range=(0, 100)), name="category_late_fee_is_percentage"
            ),
        ]

    def __str__(self):
        return self.name


class CategoryPricing(models.Model):
    """The allowed price range for a category and pricing unit (SR-F-PRC-01)."""

    category = models.ForeignKey(ServiceCategory, on_delete=models.CASCADE, related_name="pricing")
    unit = models.CharField(max_length=12, choices=PricingUnit.choices)
    min_price = models.PositiveIntegerField(help_text="KES")
    max_price = models.PositiveIntegerField(help_text="KES")

    class Meta:
        verbose_name_plural = "category pricing"
        constraints = [
            models.UniqueConstraint(fields=["category", "unit"], name="categorypricing_one_per_unit"),
            models.CheckConstraint(condition=Q(min_price__gte=1), name="categorypricing_min_positive"),
            models.CheckConstraint(condition=Q(max_price__gte=F("min_price")), name="categorypricing_max_above_min"),
        ]

    def __str__(self):
        return f"{self.category} {self.get_unit_display()}: KES {self.min_price}-{self.max_price}"


class PriceEstimate(models.Model):
    """The suggested range for one experience level (SR-F-PRC-03). Higher levels get higher ranges."""

    pricing = models.ForeignKey(CategoryPricing, on_delete=models.CASCADE, related_name="estimates")
    experience_level = models.CharField(max_length=12, choices=ProviderProfile.ExperienceLevel.choices)
    low = models.PositiveIntegerField(help_text="KES")
    high = models.PositiveIntegerField(help_text="KES")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["pricing", "experience_level"], name="priceestimate_one_per_level"),
            models.CheckConstraint(condition=Q(high__gte=F("low")), name="priceestimate_high_above_low"),
        ]

    def clean(self):
        if self.pricing_id and not (self.pricing.min_price <= self.low <= self.high <= self.pricing.max_price):
            raise ValidationError("The estimate must sit inside the category's minimum and maximum price.")


class ListingStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    PAUSED = "paused", "Paused"
    REMOVED = "removed", "Removed"


class Listing(models.Model):
    """A service a provider offers (SR-F-LST-02, 03)."""

    Status = ListingStatus

    provider = models.ForeignKey(ProviderProfile, on_delete=models.PROTECT, related_name="listings")
    category = models.ForeignKey(ServiceCategory, on_delete=models.PROTECT, related_name="listings")
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.PositiveIntegerField(help_text="Whole Kenya shillings")
    pricing_unit = models.CharField(max_length=12, choices=PricingUnit.choices)
    # Clients only ever see this approximate area (SR-F-SRC-07). Coordinates arrive with the map picker.
    area_name = models.CharField(max_length=120, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    radius_km = models.PositiveSmallIntegerField(default=5)
    availability = models.CharField(max_length=200, blank=True)
    provider_terms = models.TextField(blank=True, help_text="May add to the category job rules but not weaken them.")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["status", "category"], name="listing_status_category_idx")]
        constraints = [
            models.CheckConstraint(condition=Q(price__gte=1), name="listing_price_positive"),
            models.CheckConstraint(condition=Q(radius_km__range=(1, 50)), name="listing_radius_range"),
            models.CheckConstraint(condition=Q(status__in=ListingStatus.values), name="listing_status_valid"),
            models.CheckConstraint(condition=Q(pricing_unit__in=PricingUnit.values), name="listing_unit_valid"),
        ]

    def __str__(self):
        return self.title
