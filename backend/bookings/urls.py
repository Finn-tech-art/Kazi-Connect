from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("provider/bookings", views.ProviderBookingViewSet, basename="provider-booking")
router.register("bookings", views.ClientBookingViewSet, basename="booking")

urlpatterns = router.urls
