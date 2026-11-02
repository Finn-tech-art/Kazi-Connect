from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsActiveAccount, IsActiveProvider

from . import services
from .models import JobPost
from .serializers import JobPostSerializer, OpenJobPostSerializer


class MyJobPostViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Job posts the signed-in client created. Any active account can post (Hiring mode)."""

    permission_classes = [IsActiveAccount]
    serializer_class = JobPostSerializer
    http_method_names = ["get", "post", "patch"]

    def get_queryset(self):
        return (
            JobPost.objects.filter(client=self.request.user.account)
            .exclude(status=JobPost.Status.REMOVED)
            .select_related("category")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        serializer.instance = services.create_job_post(self.request.user.account, **serializer.validated_data)

    def perform_update(self, serializer):
        serializer.instance = services.update_job_post(serializer.instance, **serializer.validated_data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        return Response(self.get_serializer(services.close_job_post(self.get_object())).data)


class OpenJobPostViewSet(viewsets.ReadOnlyModelViewSet):
    """Open job posts for providers to browse. A provider never sees their own posts here."""

    permission_classes = [IsActiveProvider]
    serializer_class = OpenJobPostSerializer

    def get_queryset(self):
        posts = (
            services.open_job_posts()
            .exclude(client=self.request.user.account)
            .select_related("category", "client")
            .order_by("-created_at")
        )
        category = self.request.query_params.get("category")
        return posts.filter(category__slug=category) if category else posts
