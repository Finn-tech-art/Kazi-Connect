"""Initial service categories and job rules from SRS Appendix B (Table 48).

Admins confirm and extend these before the pilot (OI-08). Prices are set by admins in the console.
"""

from django.db import migrations

CATEGORIES = [
    {
        "name": "Tutoring",
        "slug": "tutoring",
        "description": "Lessons, revision and homework help.",
        "is_higher_risk": True,  # higher-risk when the learner is under 18
        "sort_order": 1,
        "job_rules": (
            "Sessions with a learner under 18 take place with a parent or guardian present on the premises.\n"
            "Sessions at a private home take place in a shared area of the home.\n"
            "Session length and subject are stated in the booking."
        ),
    },
    {
        "name": "Home cleaning",
        "slug": "home-cleaning",
        "description": "Rooms, laundry and household cleaning.",
        "is_higher_risk": True,
        "sort_order": 2,
        "job_rules": (
            "Work takes place between 7:00 and 19:00.\n"
            "The client or an adult representative is present at the start and end of the job.\n"
            "The client lists the rooms and tasks in the booking.\n"
            "Cleaning products are supplied by the party named in the booking."
        ),
    },
    {
        "name": "Photography",
        "slug": "photography",
        "description": "Events, portraits and product photos.",
        "is_higher_risk": False,
        "sort_order": 3,
        "job_rules": (
            "The booking states the event, hours, number of edited photos and delivery date.\n"
            "The client and provider agree in the booking how the photos may be used.\n"
            "Delivery means sending the final photos through an agreed link."
        ),
    },
    {
        "name": "Graphic design",
        "slug": "graphic-design",
        "description": "Logos, posters, social media and print design.",
        "is_higher_risk": False,
        "sort_order": 4,
        "job_rules": (
            "The booking states the deliverables, file formats, number of revisions and deadline.\n"
            "The provider keeps the client's materials confidential.\n"
            "Delivery means sending final files through the platform chat or an agreed link."
        ),
    },
]


def seed(apps, schema_editor):
    ServiceCategory = apps.get_model("listings", "ServiceCategory")
    for category in CATEGORIES:
        ServiceCategory.objects.update_or_create(slug=category["slug"], defaults=category)


def unseed(apps, schema_editor):
    apps.get_model("listings", "ServiceCategory").objects.filter(slug__in=[c["slug"] for c in CATEGORIES]).delete()


class Migration(migrations.Migration):
    dependencies = [("listings", "0001_initial")]
    operations = [migrations.RunPython(seed, unseed)]
