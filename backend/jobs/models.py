from django.db import models
from django.db.models import F, Q

from accounts.models import Account
from listings.models import ServiceCategory


class JobPostStatus(models.TextChoices):
    OPEN = "open", "Open"
    CLOSED = "closed", "Closed"
    REMOVED = "removed", "Removed by admin"


class JobPost(models.Model):
    """Work a client needs done, which providers can browse.

    Not in SRS v1.0: added as change request CR-01 (see the database design document).
    """

    Status = JobPostStatus

    client = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="job_posts")
    category = models.ForeignKey(ServiceCategory, on_delete=models.PROTECT, related_name="job_posts")
    title = models.CharField(max_length=100)
    description = models.TextField()
    budget_min = models.PositiveIntegerField(help_text="Whole Kenya shillings")
    budget_max = models.PositiveIntegerField(help_text="Whole Kenya shillings")
    area_name = models.CharField(max_length=120, blank=True, help_text="Approximate area only, never an address.")
    is_remote = models.BooleanField(default=False)
    preferred_date = models.DateField(null=True, blank=True)
    job_rules_accepted_at = models.DateTimeField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    expires_at = models.DateTimeField()
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["status", "category", "expires_at"], name="jobpost_open_browse_idx")]
        constraints = [
            models.CheckConstraint(condition=Q(budget_min__gte=1), name="jobpost_budget_positive"),
            models.CheckConstraint(condition=Q(budget_max__gte=F("budget_min")), name="jobpost_budget_max_above_min"),
            models.CheckConstraint(condition=Q(is_remote=True) | ~Q(area_name=""), name="jobpost_area_unless_remote"),
            models.CheckConstraint(condition=Q(status__in=JobPostStatus.values), name="jobpost_status_valid"),
        ]

    def __str__(self):
        return self.title
