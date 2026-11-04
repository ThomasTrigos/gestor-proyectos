from datetime import timedelta
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework.throttling import ScopedRateThrottle
from django.core.cache import cache

from .models import Personal, Invitacion
from .throttling import LoginIdentifierRateThrottle
from .serializers import (
    PersonalSerializer, PersonalListSerializer,
    InvitacionSerializer, CompletarRegistroSerializer
)
from apps.personal.permissions import EsRRHH, EsRRHHoGerente
from apps.core.services.email_service import enviar_email_invitacion


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle, LoginIdentifierRateThrottle]
    throttle_scope = 'auth_login'

    def post(self, request):
        identificador = (
            request.data.get('identificador')
            or request.data.get('username')
            or request.data.get('email')
            or ''
        ).strip()
        password = request.data.get('password', '')

        if not identificador or not password:
            return Response(
                {'error': 'Debe ingresar un usuario o correo electrónico y la contraseña.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Buscar usuario por nombre de usuario (username) o por correo electrónico (email)
        user = User.objects.filter(
            Q(username__iexact=identificador) | Q(email__iexact=identificador)
        ).first()

        if not user or not user.check_password(password):
            return Response(
                {'error': 'Credenciales inválidas. Verifique el usuario/email y la contraseña.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'La cuenta se encuentra a la espera de aprobación por Recursos Humanos o ha sido desactivada.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Generar tokens JWT
        refresh = RefreshToken.for_user(user)
        access_token_str = str(refresh.access_token)
        refresh_token_str = str(refresh)

        # Obtener datos de Personal asociado
        personal = getattr(user, 'personal', None)
        if personal:
            user_data = {
                'id': str(personal.id),
                'email': personal.email,
                'nombre': personal.nombre,
                'apellido': personal.apellido,
                'telefono': personal.telefono or '',
                'cargo': personal.cargo or '',
                'rol': personal.rol,
                'username': user.username,
            }
        else:
            rol = 'RRHH' if (user.is_staff or user.is_superuser) else 'GERENTE'
            user_data = {
                'id': str(user.id),
                'email': user.email or f"{user.username}@gestor.com",
                'nombre': user.first_name or user.username,
                'apellido': user.last_name or '',
                'telefono': '',
                'cargo': 'Directivo',
                'rol': rol,
                'username': user.username,
            }

        response = Response({
            'access': access_token_str,
            'refresh': refresh_token_str,
            'user': user_data,
        })

        # Configurar Cookies HttpOnly Seguras (inmunes a extracción por scripts XSS)
        is_secure = not settings.DEBUG
        samesite_policy = 'None' if is_secure else 'Lax'
        response.set_cookie(
            'access_token',
            access_token_str,
            httponly=True,
            secure=is_secure,
            samesite=samesite_policy,
            max_age=10 * 60  # 10 minutos (coincidente con ACCESS_TOKEN_LIFETIME)
        )
        response.set_cookie(
            'refresh_token',
            refresh_token_str,
            httponly=True,
            secure=is_secure,
            samesite=samesite_policy,
            path='/api/auth/',
            max_age=7 * 24 * 3600  # 7 días
        )

        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # 1. Invalidar el Refresh Token en blacklist permanente
        refresh_token = request.data.get('refresh') or request.COOKIES.get('refresh_token')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass

        # 2. Revocar inmediatamente el Access Token en caché durante su tiempo de vida remanente
        access_token = (
            request.data.get('access')
            or request.COOKIES.get('access_token')
            or request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '').strip()
        )
        if access_token:
            try:
                acc_token = AccessToken(access_token)
                jti = acc_token.get('jti')
                if jti:
                    cache.set(f"revoked_access_{jti}", True, timeout=600)
            except Exception:
                pass

        response = Response({'ok': True, 'mensaje': 'Sesión cerrada exitosamente.'})
        is_secure = not settings.DEBUG
        samesite_policy = 'None' if is_secure else 'Lax'
        response.delete_cookie('access_token', samesite=samesite_policy)
        response.delete_cookie('refresh_token', path='/api/auth/', samesite=samesite_policy)
        return response


class PersonalViewSet(viewsets.ModelViewSet):
    queryset = Personal.objects.all().order_by('-created_at')
    permission_classes = [EsRRHHoGerente]
    filterset_fields = ['rol', 'activo']
    search_fields = ['nombre', 'apellido', 'email']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PersonalListSerializer
        return PersonalSerializer

    def get_permissions(self):
        if self.action in ['mi_perfil', 'cambiar_password']:
            return [IsAuthenticated()]
        return [EsRRHHoGerente()]

    @action(detail=False, methods=['post'])
    def cambiar_password(self, request):
        """
        Permite a cualquier usuario autenticado actualizar su propia contraseña
        proporcionando su contraseña actual para validar su identidad.
        """
        user = request.user
        password_actual = request.data.get('password_actual', '').strip()
        password_nuevo = request.data.get('password_nuevo', '').strip()
        password_confirm = request.data.get('password_confirm', '').strip()

        if not password_actual or not password_nuevo or not password_confirm:
            return Response(
                {'error': 'Debe completar los tres campos: contraseña actual, nueva contraseña y su confirmación.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(password_actual):
            return Response(
                {'error': 'La contraseña actual no es correcta. Verifique e intente nuevamente.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if password_nuevo != password_confirm:
            return Response(
                {'error': 'La nueva contraseña y su confirmación no coinciden.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(password_nuevo) < 6:
            return Response(
                {'error': 'La nueva contraseña debe tener al menos 6 caracteres por seguridad.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if password_actual == password_nuevo:
            return Response(
                {'error': 'La nueva contraseña debe ser diferente a la contraseña actual.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(password_nuevo)
        user.save()

        return Response({
            'ok': True,
            'mensaje': 'Tu contraseña ha sido actualizada con éxito. Úsala en tu próximo inicio de sesión.'
        })

    @action(detail=False, methods=['get', 'patch', 'put'])
    def mi_perfil(self, request):
        """
        Permite a cualquier usuario autenticado (de cualquier rol) consultar
        y actualizar sus medios de contacto (teléfono, email, datos personales).
        """
        user = request.user
        personal = getattr(user, 'personal', None)

        if request.method == 'GET':
            if personal:
                return Response(PersonalSerializer(personal).data)
            return Response({
                'id': str(user.id),
                'nombre': user.first_name or user.username,
                'apellido': user.last_name or '',
                'email': user.email,
                'telefono': '',
                'cargo': 'Directivo' if user.is_staff else 'Gerente',
                'rol': 'RRHH' if (user.is_staff or user.is_superuser) else 'GERENTE',
                'username': user.username,
            })

        # PATCH / PUT
        telefono = request.data.get('telefono')
        email = request.data.get('email')
        nombre = request.data.get('nombre')
        apellido = request.data.get('apellido')

        if personal:
            if telefono is not None:
                personal.telefono = telefono.strip()
            if email is not None and email.strip():
                nuevo_email = email.strip()
                if Personal.objects.filter(email__iexact=nuevo_email).exclude(id=personal.id).exists():
                    return Response({'error': 'El correo electrónico ingresado ya se encuentra registrado por otro usuario.'}, status=400)
                personal.email = nuevo_email
                user.email = nuevo_email
                user.save(update_fields=['email'])
            if nombre is not None and nombre.strip():
                personal.nombre = nombre.strip()
                user.first_name = nombre.strip()
                user.save(update_fields=['first_name'])
            if apellido is not None:
                personal.apellido = apellido.strip()
                user.last_name = apellido.strip()
                user.save(update_fields=['last_name'])
            personal.save()

            user_data = {
                'id': str(personal.id),
                'email': personal.email,
                'nombre': personal.nombre,
                'apellido': personal.apellido,
                'telefono': personal.telefono,
                'cargo': personal.cargo,
                'rol': personal.rol,
                'username': user.username,
            }
            return Response({
                'ok': True,
                'mensaje': 'Medios de contacto y datos de perfil actualizados exitosamente.',
                'user': user_data,
                'personal': PersonalSerializer(personal).data
            })
        else:
            if email is not None and email.strip():
                user.email = email.strip()
            if nombre is not None and nombre.strip():
                user.first_name = nombre.strip()
            if apellido is not None:
                user.last_name = apellido.strip()
            user.save()
            user_data = {
                'id': str(user.id),
                'email': user.email,
                'nombre': user.first_name or user.username,
                'apellido': user.last_name or '',
                'telefono': (telefono or '').strip(),
                'cargo': 'Directivo',
                'rol': 'RRHH' if (user.is_staff or user.is_superuser) else 'GERENTE',
                'username': user.username,
            }
            return Response({
                'ok': True,
                'mensaje': 'Datos de perfil actualizados exitosamente.',
                'user': user_data
            })


class InvitacionViewSet(viewsets.ModelViewSet):
    queryset = Invitacion.objects.all().order_by('-created_at')
    serializer_class = InvitacionSerializer
    permission_classes = [EsRRHHoGerente]
    filterset_fields = ['estado', 'rol']
    search_fields = ['email', 'nombre', 'apellido', 'cargo']

    def perform_create(self, serializer):
        user = self.request.user
        personal = getattr(user, 'personal', None)

        rol_a_invitar = serializer.validated_data.get('rol', 'EMPLEADO')
        # Regla: RRHH solo puede invitar a Empleados; Gerente puede invitar a cualquiera
        if personal and personal.rol == 'RRHH' and rol_a_invitar in ['RRHH', 'GERENTE']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Los usuarios de Recursos Humanos solo pueden invitar personal con rol EMPLEADO.")

        invitacion = serializer.save(creado_por=personal)
        # Despachar correo de invitación con detección del host emisor
        enviar_email_invitacion(invitacion, request=self.request)

    @action(detail=True, methods=['post'])
    def reenviar(self, request, pk=None):
        invitacion = self.get_object()
        if invitacion.estado == 'APROBADO':
            return Response({'error': 'Esta invitación ya fue aceptada y el usuario está aprobado.'}, status=400)
        
        # Renovar vigencia a 48 horas a partir de ahora
        invitacion.fecha_expiracion = timezone.now() + timedelta(hours=48)
        invitacion.estado = 'PENDIENTE'
        invitacion.save(update_fields=['fecha_expiracion', 'estado'])

        enviar_email_invitacion(invitacion, request=request)
        return Response({'ok': True, 'mensaje': f'Invitación reenviada exitosamente a {invitacion.email}. Vence en 48 horas.'})

    @action(detail=True, methods=['post'])
    def revocar(self, request, pk=None):
        invitacion = self.get_object()
        if invitacion.estado == 'APROBADO':
            return Response({'error': 'No se puede revocar una invitación ya aprobada.'}, status=400)
        
        invitacion.estado = 'REVOCADA'
        invitacion.save(update_fields=['estado'])
        return Response({'ok': True, 'mensaje': 'Invitación revocada correctamente.'})

    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """
        Aprobación formal por parte de RRHH o Gerente del usuario registrado.
        """
        invitacion = self.get_object()
        user_aprobador = request.user
        personal_aprobador = getattr(user_aprobador, 'personal', None)

        if not invitacion.personal_creado:
            return Response({'error': 'El usuario aún no ha completado el formulario de registro con su contraseña.'}, status=400)

        # Activar la ficha de Personal y el User de Django
        personal = invitacion.personal_creado
        personal.activo = True
        personal.save(update_fields=['activo'])

        if personal.user:
            personal.user.is_active = True
            personal.user.save(update_fields=['is_active'])

        invitacion.estado = 'APROBADO'
        invitacion.aprobado_por = personal_aprobador
        invitacion.fecha_aprobacion = timezone.now()
        invitacion.save(update_fields=['estado', 'aprobado_por', 'fecha_aprobacion'])

        return Response({
            'ok': True,
            'mensaje': f'El usuario {personal.nombre} {personal.apellido} ha sido formalmente aprobado y ya puede iniciar sesión en la plataforma.'
        })


class ValidarInvitacionView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'invitaciones_publicas'

    def get(self, request):
        token_str = request.query_params.get('token')
        if not token_str:
            return Response({'valido': False, 'error': 'Token de invitación no proporcionado.'}, status=400)

        try:
            invitacion = Invitacion.objects.get(token=token_str)
        except (Invitacion.DoesNotExist, ValueError):
            return Response({'valido': False, 'error': 'El enlace de invitación no es válido o no existe.'}, status=404)

        if invitacion.estado == 'APROBADO':
            return Response({
                'valido': False,
                'error': 'Esta invitación ya fue utilizada y la cuenta ya está activada. Puedes iniciar sesión normalmente.'
            }, status=400)

        if invitacion.estado == 'REVOCADA':
            return Response({
                'valido': False,
                'error': 'Esta invitación ha sido revocada por la administración.'
            }, status=400)

        if invitacion.esta_expirada():
            return Response({
                'valido': False,
                'expirada': True,
                'error': 'El enlace de invitación ha vencido (plazo límite de 48 horas superado). Solicita a Recursos Humanos que te reenvíen la invitación.'
            }, status=400)

        diff = invitacion.fecha_expiracion - timezone.now()
        horas_restantes = max(0, int(diff.total_seconds() // 3600))

        return Response({
            'valido': True,
            'email': invitacion.email,
            'nombre': invitacion.nombre,
            'apellido': invitacion.apellido,
            'cargo': invitacion.cargo,
            'rol': invitacion.rol,
            'rol_display': invitacion.get_rol_display(),
            'horas_restantes': horas_restantes,
            'fecha_expiracion': invitacion.fecha_expiracion
        })


class CompletarRegistroView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'invitaciones_publicas'

    def post(self, request):
        serializer = CompletarRegistroSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        token = serializer.validated_data['token']
        password = serializer.validated_data['password']

        try:
            invitacion = Invitacion.objects.get(token=token)
        except (Invitacion.DoesNotExist, ValueError):
            return Response({'error': 'Invitación inválida.'}, status=404)

        if invitacion.estado == 'APROBADO':
            return Response({'error': 'Esta invitación ya fue completada anteriormente.'}, status=400)

        if invitacion.esta_expirada():
            return Response({'error': 'La invitación ha expirado.'}, status=400)

        # Generar username único a partir del email o nombre
        base_username = invitacion.email.split('@')[0]
        username = base_username
        contador = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{contador}"
            contador += 1

        # Crear User inactivo (a la espera de aprobación de RRHH)
        user = User.objects.create_user(
            username=username,
            email=invitacion.email,
            first_name=invitacion.nombre,
            last_name=invitacion.apellido,
            password=password,
            is_active=False # Inactivo hasta que RRHH lo apruebe
        )

        # Crear ficha de Personal
        personal = Personal.objects.create(
            user=user,
            nombre=invitacion.nombre,
            apellido=invitacion.apellido,
            email=invitacion.email,
            cargo=invitacion.cargo,
            rol=invitacion.rol,
            activo=False, # Inactivo hasta aprobación
            fecha_ingreso=timezone.now().date()
        )

        invitacion.personal_creado = personal
        invitacion.estado = 'REGISTRADO'
        invitacion.save(update_fields=['personal_creado', 'estado'])

        return Response({
            'ok': True,
            'mensaje': '¡Registro completado exitosamente! Tu cuenta ha sido creada y se encuentra pendiente de aprobación por el área de Recursos Humanos. Te notificaremos cuando puedas acceder.'
        })
