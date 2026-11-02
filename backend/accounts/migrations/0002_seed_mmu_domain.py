"""The MMU student email domain used in the designs. OI-03: confirm it with MMU's ICT department."""

from django.db import migrations


def seed(apps, schema_editor):
    UniversityDomain = apps.get_model("accounts", "UniversityDomain")
    UniversityDomain.objects.get_or_create(
        domain="students.mmu.ac.ke", defaults={"university_name": "Multimedia University of Kenya"}
    )


def unseed(apps, schema_editor):
    apps.get_model("accounts", "UniversityDomain").objects.filter(domain="students.mmu.ac.ke").delete()


class Migration(migrations.Migration):
    dependencies = [("accounts", "0001_initial")]
    operations = [migrations.RunPython(seed, unseed)]
