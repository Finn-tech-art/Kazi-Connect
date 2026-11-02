"""Business rules for client job requests (change request CR-01)."""

from datetime import timedelta

from django.utils import timezone

from accounts.models import Account
from core.exceptions import BusinessRuleError
from core.models import PlatformSettings

from .models import JobPost


def open_job_posts():
    """Posts providers can see: open, not expired, from an active client."""
    return JobPost.objects.filter(
        status=JobPost.Status.OPEN,
        expires_at__gt=timezone.now(),
        client__status=Account.Status.ACTIVE,
    )


def create_job_post(client, accept_job_rules, **data):
    if not accept_job_rules:
        raise BusinessRuleError(f"Accept the {data['category'].name} job rules to post this job.", "job_rules_not_accepted")
    if not data["category"].is_active:
        raise BusinessRuleError("This category isn't available.")
    now = timezone.now()
    return JobPost.objects.create(
        client=client,
        job_rules_accepted_at=now,
        expires_at=now + timedelta(days=PlatformSettings.load().job_post_lifetime_days),
        **data,
    )


def update_job_post(post, **data):
    if post.status != JobPost.Status.OPEN:
        raise BusinessRuleError("Only an open job post can be edited.")
    data.pop("accept_job_rules", None)
    if "category" in data and data["category"] != post.category:
        raise BusinessRuleError("Close this post and create a new one to change the category.")
    for field, value in data.items():
        setattr(post, field, value)
    post.save()
    return post


def close_job_post(post):
    if post.status != JobPost.Status.OPEN:
        raise BusinessRuleError("This job post is already closed.")
    post.status = JobPost.Status.CLOSED
    post.closed_at = timezone.now()
    post.save(update_fields=["status", "closed_at", "updated_at"])
    return post
