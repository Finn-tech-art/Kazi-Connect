from django.utils import timezone
from rest_framework import serializers

from core.time import today_in_eat
from listings.models import ServiceCategory

from .models import JobPost


class JobPostSerializer(serializers.ModelSerializer):
    """A client's own job post."""

    category = serializers.PrimaryKeyRelatedField(queryset=ServiceCategory.objects.filter(is_active=True))
    category_name = serializers.CharField(source="category.name", read_only=True)
    title = serializers.CharField(min_length=5, max_length=100)
    description = serializers.CharField(min_length=30, max_length=2000)
    budget_min = serializers.IntegerField(min_value=1, max_value=1_000_000)
    budget_max = serializers.IntegerField(min_value=1, max_value=1_000_000)
    accept_job_rules = serializers.BooleanField(write_only=True, required=False, default=False)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = JobPost
        fields = [
            "id", "category", "category_name", "title", "description", "budget_min", "budget_max",
            "area_name", "is_remote", "preferred_date", "accept_job_rules", "status", "expires_at",
            "is_expired", "created_at", "updated_at",
        ]
        read_only_fields = ["status", "expires_at", "created_at", "updated_at"]

    def get_is_expired(self, post):
        return post.expires_at <= timezone.now()

    def validate_preferred_date(self, value):
        if value and value < today_in_eat():
            raise serializers.ValidationError("Choose today or a later date.")
        return value

    def validate(self, data):
        budget_min = data.get("budget_min", getattr(self.instance, "budget_min", None))
        budget_max = data.get("budget_max", getattr(self.instance, "budget_max", None))
        if budget_min and budget_max and budget_max < budget_min:
            raise serializers.ValidationError({"budget_max": "The maximum budget can't be lower than the minimum."})
        is_remote = data.get("is_remote", getattr(self.instance, "is_remote", False))
        area_name = data.get("area_name", getattr(self.instance, "area_name", ""))
        if not is_remote and not area_name.strip():
            raise serializers.ValidationError({"area_name": "Say roughly where the job is, or mark it as remote."})
        return data


class OpenJobPostSerializer(serializers.ModelSerializer):
    """A job post as providers see it: the client's first name and area, no contact details."""

    category = serializers.SerializerMethodField()
    client = serializers.SerializerMethodField()

    class Meta:
        model = JobPost
        fields = [
            "id", "category", "title", "description", "budget_min", "budget_max", "area_name",
            "is_remote", "preferred_date", "expires_at", "created_at", "client",
        ]

    def get_category(self, post):
        return {"name": post.category.name, "slug": post.category.slug, "job_rules": post.category.job_rules}

    def get_client(self, post):
        return {
            "first_name": post.client.full_name.split()[0],
            "account_category": post.client.category,
            "member_since": post.client.created_at,
        }
