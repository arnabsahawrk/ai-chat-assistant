from django.urls import path
from apps.accounts.views import GoogleLoginView
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.utils import extend_schema, extend_schema_view

app_name = "accounts"


@extend_schema_view(
    post=extend_schema(
        tags=["auth"],
        summary="Refresh access token",
        description="Exchange a valid refresh token for a new access token. Refresh tokens expire after 7 days.",
        responses={
            200: {
                "type": "object",
                "properties": {"access": {"type": "string"}},
            },
            401: {"description": "Refresh token is invalid or expired."},
        },
        auth=[],
    )
)
class TokenRefreshSchemaView(TokenRefreshView):
    pass


urlpatterns = [
    path("google/", GoogleLoginView.as_view(), name="google_login"),
    path("token/refresh/", TokenRefreshSchemaView.as_view(), name="token_refresh"),
]
