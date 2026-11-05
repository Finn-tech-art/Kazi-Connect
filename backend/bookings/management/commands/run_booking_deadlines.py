from django.core.management.base import BaseCommand

from bookings.services import apply_due_deadlines


class Command(BaseCommand):
    help = "Expire unanswered booking requests and cancel unpaid bookings (SR-F-BKG-03, 04). Run every 5 minutes."

    def handle(self, *args, **options):
        count = apply_due_deadlines()
        self.stdout.write(f"Bookings past a deadline: {count}")
