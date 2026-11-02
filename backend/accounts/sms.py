import sys

from django.conf import settings
from django.utils.module_loading import import_string


class ConsoleSMSBackend:
    """Prints messages to the terminal instead of sending them. For development only.

    A real gateway (OI-04, e.g. Africa's Talking) gets its own class with the same
    `send(phone, message)` method, selected with the SMS_BACKEND setting.
    """

    def send(self, phone, message):
        sys.stdout.write(f"\n----- SMS to {phone} -----\n{message}\n---------------------------\n")
        sys.stdout.flush()


def send_sms(phone, message):
    backend = import_string(settings.SMS_BACKEND)()
    backend.send(phone, message)
