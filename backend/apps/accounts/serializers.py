from dj_rest_auth.serializers import UserDetailsSerializer
from rest_framework import serializers


class CustomUserDetailsSerializer(UserDetailsSerializer):
    profile_picture = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta(UserDetailsSerializer.Meta):
        fields = UserDetailsSerializer.Meta.fields + ("profile_picture", "full_name")

    def get_profile_picture(self, obj):
        social_account = obj.socialaccount_set.filter(provider="google").first()
        if social_account:
            return social_account.extra_data.get("picture")
        return None

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username
