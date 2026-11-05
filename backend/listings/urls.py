from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("provider/listings", views.ProviderListingViewSet, basename="provider-listing")

urlpatterns = [
    path("categories/", views.CategoryListView.as_view(), name="categories"),
    path("listings/", views.PublicListingListView.as_view(), name="listings"),
    path("listings/<int:pk>/", views.PublicListingDetailView.as_view(), name="listing-detail"),
    *router.urls,
]
