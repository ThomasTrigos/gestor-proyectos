from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.core.cache import cache
from .models import Personal
import uuid

class CookieJWTAuthentication(JWTAuthentication):
    """
    Autenticación JWT que soporta lectura tanto del encabezado HTTP Authorization: Bearer <token>
    como de cookies HttpOnly seguras ('access_token').
    Verifica además revocación inmediata por cierre de sesión (blacklist de access token).
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            raw_token = request.COOKIES.get('access_token')

        if raw_token is None:
            return None

        if isinstance(raw_token, str):
            raw_token = raw_token.encode('utf-8')

        validated_token = self.get_validated_token(raw_token)

        # Verificar revocación inmediata de access token post-logout
        jti = validated_token.get('jti')
        if jti and cache.get(f"revoked_access_{jti}"):
            raise AuthenticationFailed('La sesión ha sido cerrada y el token ha sido revocado.', code='token_revoked')

        return self.get_user(validated_token), validated_token


class TokenConfirmacionAuthentication(BaseAuthentication):
    def authenticate(self, request):
        token = request.query_params.get('token')
        if not token:
            return None
        try:
            val = uuid.UUID(token)
            personal = Personal.objects.get(token_confirmacion=val)
            return (personal, None)
        except (ValueError, Personal.DoesNotExist):
            raise AuthenticationFailed('Token inválido')
