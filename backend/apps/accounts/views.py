from dj_rest_auth.registration.views import SocialLoginView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from decouple import config
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse
from apps.core.swagger import RESPONSE_400, EXAMPLE_JWT_RESPONSE


class GoogleLoginView(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = config("FRONTEND_URL")
    client_class = OAuth2Client

    @extend_schema(
        tags=["auth"],
        summary="Google OAuth login",
        description=(
            "Exchange a Google OAuth access token for a JWT pair. "
            "The frontend obtains the Google access token via the implicit OAuth flow "
            "and sends it here. The backend validates it with Google, creates or finds "
            "the user, and returns JWT access and refresh tokens."
        ),
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "access_token": {
                        "type": "string",
                        "description": "Google OAuth access token obtained from the frontend OAuth popup.",
                    }
                },
                "required": ["access_token"],
            }
        },
        responses={
            200: OpenApiResponse(
                description="Login successful. Returns JWT tokens and user details.",
                examples=[EXAMPLE_JWT_RESPONSE],
            ),
            400: RESPONSE_400,
        },
        examples=[
            OpenApiExample(
                name="Google token",
                value={"access_token": "ya29.a0ARrdaM..."},
                request_only=True,
            )
        ],
        auth=[],  # this endpoint does not require JWT
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)
