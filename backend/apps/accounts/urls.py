from django.urls import path
from apps.accounts.views import GoogleLoginView
from rest_framework_simplejwt.views import TokenRefreshView

app_name = "accounts"
urlpatterns = [
    path("google/", GoogleLoginView.as_view(), name="google_login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
