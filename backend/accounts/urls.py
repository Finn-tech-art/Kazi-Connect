from django.urls import path

from . import views

urlpatterns = [
    path("me/", views.MeView.as_view(), name="me"),
    path("me/phone/send-code/", views.SendPhoneCodeView.as_view(), name="me-phone-send-code"),
    path("me/phone/verify/", views.VerifyPhoneView.as_view(), name="me-phone-verify"),
    path("me/mode/", views.SwitchModeView.as_view(), name="me-mode"),
    path("me/student-verification/", views.StudentVerificationRequestView.as_view(), name="student-verification"),
    path("student-verification/confirm/", views.StudentVerificationConfirmView.as_view(), name="student-verification-confirm"),
    path("provider/", views.ProviderView.as_view(), name="provider"),
    path("provider/payout-phone/", views.PayoutPhoneView.as_view(), name="payout-phone"),
    path("provider/payout-phone/send-code/", views.PayoutPhoneSendCodeView.as_view(), name="payout-phone-send-code"),
    path("provider/payout-phone/verify/", views.PayoutPhoneVerifyView.as_view(), name="payout-phone-verify"),
    path("provider/category/", views.ProviderCategoryView.as_view(), name="provider-category"),
    path("provider/code-of-conduct/", views.CodeOfConductView.as_view(), name="provider-code-of-conduct"),
]
