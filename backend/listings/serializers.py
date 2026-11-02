from rest_framework import serializers

from core.models import PlatformSettings
from core.money import commission_for

from . import services
from .models import CategoryPricing, Listing, ServiceCategory


class CategoryPricingSerializer(serializers.ModelSerializer):
    estimates = serializers.SerializerMethodField()

    class Meta:
        model = CategoryPricing
        fields = ["unit", "min_price", "max_price", "estimates"]

    def get_estimates(self, pricing):
        return {e.experience_level: {"low": e.low, "high": e.high} for e in pricing.estimates.all()}


class CategorySerializer(serializers.ModelSerializer):
    pricing = CategoryPricingSerializer(many=True, read_only=True)

    class Meta:
        model = ServiceCategory
        fields = ["id", "name", "slug", "description", "job_rules", "is_higher_risk", "requires_badge", "pricing"]


class ListingSerializer(serializers.ModelSerializer):
    """A provider's own listing, as shown in the listing editor."""

    category = serializers.PrimaryKeyRelatedField(queryset=ServiceCategory.objects.filter(is_active=True))
    category_name = serializers.CharField(source="category.name", read_only=True)
    title = serializers.CharField(min_length=5, max_length=100)
    description = serializers.CharField(max_length=600, allow_blank=True, required=False)
    price = serializers.IntegerField(min_value=1, max_value=1_000_000)
    radius_km = serializers.IntegerField(min_value=1, max_value=50, required=False)
    provider_terms = serializers.CharField(max_length=500, allow_blank=True, required=False)
    commission = serializers.SerializerMethodField()
    net_payout = serializers.SerializerMethodField()
    publish_checks = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            "id", "category", "category_name", "title", "description", "price", "pricing_unit",
            "area_name", "radius_km", "availability", "provider_terms", "status", "published_at",
            "created_at", "updated_at", "commission", "net_payout", "publish_checks",
        ]
        read_only_fields = ["status", "published_at", "created_at", "updated_at"]

    def _commission_percent(self, listing):
        if "platform_settings" not in self.context:
            self.context["platform_settings"] = PlatformSettings.load()
        return self.context["platform_settings"].commission_percent_for(listing.provider.account.category)

    def get_commission(self, listing):
        percent = self._commission_percent(listing)
        return None if percent is None else commission_for(listing.price, percent)

    def get_net_payout(self, listing):
        commission = self.get_commission(listing)
        return None if commission is None else listing.price - commission

    def get_publish_checks(self, listing):
        return services.publish_checks(listing)


class PublicListingSerializer(serializers.ModelSerializer):
    """What anyone browsing sees. Only the approximate area, never coordinates (SR-F-SRC-07)."""

    category = serializers.SerializerMethodField()
    provider = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            "id", "title", "description", "price", "pricing_unit", "area_name", "radius_km",
            "availability", "provider_terms", "category", "provider", "published_at",
        ]

    def get_category(self, listing):
        return {"name": listing.category.name, "slug": listing.category.slug, "job_rules": listing.category.job_rules}

    def get_provider(self, listing):
        account = listing.provider.account
        return {
            "name": account.full_name,
            "account_category": account.category,
            "experience_level": listing.provider.experience_level,
            "member_since": account.created_at,
        }
