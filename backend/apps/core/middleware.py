import threading
from django.conf import settings

_thread_locals = threading.local()

def get_current_user():
    return getattr(_thread_locals, 'user', None)

class CurrentUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = request.user if hasattr(request, 'user') else None
        response = self.get_response(request)
        return response


class SecurityHeadersMiddleware:
    """
    Middleware que inyecta encabezados de seguridad HTTP modernos recomendados por OWASP:
    - Content-Security-Policy (CSP)
    - Permissions-Policy
    - Referrer-Policy
    - Strict-Transport-Security (HSTS en conexiones seguras)
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Content-Security-Policy restrictivo pero compatible con Vite, Tailwind y WebSockets
        if 'Content-Security-Policy' not in response:
            response['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com data:; "
                "img-src 'self' data: blob: https:; "
                "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https://*.trycloudflare.com; "
                "frame-ancestors 'none'; "
                "object-src 'none'; "
                "base-uri 'self';"
            )

        # Permissions-Policy para restringir APIs del navegador innecesarias
        if 'Permissions-Policy' not in response:
            response['Permissions-Policy'] = (
                "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
                "magnetometer=(), microphone=(), payment=(), usb=()"
            )

        # Referrer-Policy
        if 'Referrer-Policy' not in response:
            response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # HSTS para HTTPS
        if request.is_secure() or not settings.DEBUG:
            if 'Strict-Transport-Security' not in response:
                response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'

        return response
