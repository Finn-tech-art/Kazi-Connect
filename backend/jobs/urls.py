from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
# "mine" is registered first so /job-posts/mine/ isn't read as a job post id.
router.register("job-posts/mine", views.MyJobPostViewSet, basename="my-job-post")
router.register("job-posts", views.OpenJobPostViewSet, basename="open-job-post")

urlpatterns = router.urls
