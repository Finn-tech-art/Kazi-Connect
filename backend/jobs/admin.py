from django.contrib import admin

from .models import JobPost


@admin.register(JobPost)
class JobPostAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "client", "budget_min", "budget_max", "status", "expires_at"]
    list_filter = ["status", "category"]
    search_fields = ["title", "client__full_name", "client__email"]
    readonly_fields = ["client", "job_rules_accepted_at", "created_at", "updated_at", "closed_at"]
