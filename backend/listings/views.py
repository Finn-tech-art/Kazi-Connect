from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.models import Account, ProviderProfile
from accounts.permissions import HasProviderProfile

from . import services
from .models import Listing, ServiceCategory
from .serializers import CategorySerializer, ListingSerializer, PublicListingSerializer


class CategoryListView(generics.ListAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    pagination_class = None
    serializer_class = CategorySerializer
    queryset = ServiceCategory.objects.filter(is_active=True).prefetch_related("pricing__estimates")


class ProviderListingViewSet(viewsets.ModelViewSet):
    """The signed-in provider's own listings. Pending providers may create drafts."""

    permission_classes = [HasProviderProfile]
    serializer_class = ListingSerializer
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        return (
            Listing.objects.filter(provider__account=self.request.user.account)
            .exclude(status=Listing.Status.REMOVED)
            .select_related("category", "provider__account")
            .order_by("-updated_at")
        )

    def perform_create(self, serializer):
        profile = self.request.user.account.provider_profile
        serializer.instance = services.create_listing(profile, **serializer.validated_data)

    def perform_update(self, serializer):
        serializer.instance = services.update_listing(serializer.instance, **serializer.validated_data)

    def destroy(self, request, *args, **kwargs):
        services.remove_listing(self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        listing = services.publish_listing(self.get_object())
        return Response(self.get_serializer(listing).data)

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        listing = services.pause_listing(self.get_object())
        return Response(self.get_serializer(listing).data)


class PublicListingListView(generics.ListAPIView):
    """Published listings from active providers. Location search arrives with the map (SR-F-SRC)."""

    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = PublicListingSerializer

    def get_queryset(self):
        listings = (
            Listing.objects.filter(
                status=Listing.Status.PUBLISHED,
                provider__status=ProviderProfile.Status.ACTIVE,
                provider__account__status=Account.Status.ACTIVE,
            )
            .select_related("category", "provider__account")
            .order_by("-published_at")
        )
        category = self.request.query_params.get("category")
        return listings.filter(category__slug=category) if category else listings
