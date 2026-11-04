from rest_framework.throttling import SimpleRateThrottle

class LoginIdentifierRateThrottle(SimpleRateThrottle):
    """
    Limita la cantidad de intentos de inicio de sesión sobre una misma cuenta
    (identificador/email/username), independientemente de la dirección IP de origen.
    Protege contra ataques de fuerza bruta distribuidos.
    """
    scope = 'auth_login_identificador'

    def get_cache_key(self, request, view):
        if request.method != 'POST':
            return None

        identificador = (
            request.data.get('identificador')
            or request.data.get('username')
            or request.data.get('email')
            or ''
        ).strip().lower()

        if not identificador:
            return None

        return self.cache_format % {
            'scope': self.scope,
            'ident': identificador
        }
