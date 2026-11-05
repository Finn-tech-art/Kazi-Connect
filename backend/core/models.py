from django.db import models
from django.db.models import F, Q


class PlatformSettings(models.Model):
    """Values admins can change in the console (SRS Appendix A). The table always has exactly one row."""

    # OI-01: the pilot rates are not decided yet, so they start empty.
    student_commission_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    general_commission_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    job_post_lifetime_days = models.PositiveSmallIntegerField(default=30)
    booking_response_hours = models.PositiveSmallIntegerField(default=24, help_text="SR-F-BKG-03")
    payment_window_hours = models.PositiveSmallIntegerField(default=2, help_text="SR-F-BKG-04")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "platform settings"
        verbose_name_plural = "platform settings"
        constraints = [
            models.CheckConstraint(condition=Q(id=1), name="platformsettings_single_row"),
            # BRU-06: the Student rate must stay lower than the General rate.
            models.CheckConstraint(
                condition=Q(student_commission_percent__lt=F("general_commission_percent")),
                name="platformsettings_student_rate_below_general",
            ),
            models.CheckConstraint(
                condition=Q(student_commission_percent__range=(0, 100)),
                name="platformsettings_student_rate_is_percentage",
            ),
            models.CheckConstraint(
                condition=Q(general_commission_percent__range=(0, 100)),
                name="platformsettings_general_rate_is_percentage",
            ),
        ]

    def __str__(self):
        return "Platform settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings

    def commission_percent_for(self, category):
        """The commission rate for an account category ("student" or "general"), or None if not set."""
        return self.student_commission_percent if category == "student" else self.general_commission_percent
