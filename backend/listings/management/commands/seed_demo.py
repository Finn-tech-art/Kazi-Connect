from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import PlatformSettings
from listings.models import CategoryPricing, PriceEstimate, ServiceCategory

# DEMO VALUES ONLY. The real rates and price limits are open issues (OI-01) for admins to set.
# Tutoring per session follows the Figma listing editor; the rest are placeholders.
DEMO_PRICING = {
    "tutoring": [("per_session", 300, 3000, {"entry": (300, 500), "intermediate": (500, 700), "experienced": (700, 1000)})],
    "home-cleaning": [("per_job", 500, 5000, {"entry": (800, 1200), "intermediate": (1200, 1800), "experienced": (1800, 2500)})],
    "photography": [("per_hour", 500, 5000, {"entry": (500, 1000), "intermediate": (1000, 1800), "experienced": (1800, 3000)})],
    "graphic-design": [("per_job", 500, 20000, {"entry": (1000, 2500), "intermediate": (2500, 5000), "experienced": (5000, 10000)})],
}


class Command(BaseCommand):
    help = "Load demo commission rates and category prices so the listing editor can be tried out."

    @transaction.atomic
    def handle(self, *args, **options):
        settings = PlatformSettings.load()
        settings.student_commission_percent = 5
        settings.general_commission_percent = 10
        settings.save()

        for slug, units in DEMO_PRICING.items():
            category = ServiceCategory.objects.get(slug=slug)
            for unit, min_price, max_price, estimates in units:
                pricing, _ = CategoryPricing.objects.update_or_create(
                    category=category, unit=unit, defaults={"min_price": min_price, "max_price": max_price}
                )
                for level, (low, high) in estimates.items():
                    PriceEstimate.objects.update_or_create(
                        pricing=pricing, experience_level=level, defaults={"low": low, "high": high}
                    )
        self.stdout.write(self.style.SUCCESS("Demo commission rates (5% / 10%) and category prices loaded."))
