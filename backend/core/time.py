from zoneinfo import ZoneInfo

from django.utils import timezone

# Times are stored in UTC and shown in East Africa Time (SR-NF-AUD-03).
EAST_AFRICA_TIME = ZoneInfo("Africa/Nairobi")


def today_in_eat():
    return timezone.now().astimezone(EAST_AFRICA_TIME).date()
