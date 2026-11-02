from django.contrib import admin

from .models import CategoryPricing, Listing, PriceEstimate, ServiceCategory


class CategoryPricingInline(admin.TabularInline):
    model = CategoryPricing
    extra = 0


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "is_higher_risk", "requires_badge", "is_active", "sort_order"]
    prepopulated_fields = {"slug": ["name"]}
    inlines = [CategoryPricingInline]


class PriceEstimateInline(admin.TabularInline):
    model = PriceEstimate
    extra = 0


@admin.register(CategoryPricing)
class CategoryPricingAdmin(admin.ModelAdmin):
    list_display = ["category", "unit", "min_price", "max_price"]
    list_filter = ["category", "unit"]
    inlines = [PriceEstimateInline]


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "provider", "price", "pricing_unit", "status", "updated_at"]
    list_filter = ["status", "category"]
    search_fields = ["title", "provider__account__full_name"]
    readonly_fields = ["provider", "published_at", "created_at", "updated_at"]
