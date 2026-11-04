from rest_framework.permissions import BasePermission

class EsRRHH(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or user.is_staff:
            return True
        return hasattr(user, 'personal') and user.personal.rol == 'RRHH'

class EsGerente(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return hasattr(user, 'personal') and user.personal.rol == 'GERENTE'

class EsRRHHoGerente(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or user.is_staff:
            return True
        return hasattr(user, 'personal') and user.personal.rol in ['RRHH', 'GERENTE']


class EsEmpleado(BasePermission):
    def has_permission(self, request, view):
        from .models import Personal
        if isinstance(request.user, Personal):
            return request.user.rol in ['EMPLEADO', 'PROGRAMADOR']
        user = request.user
        if not user or not user.is_authenticated: return False
        return hasattr(user, 'personal') and user.personal.rol in ['EMPLEADO', 'PROGRAMADOR']

# Compatibilidad hacia atrás
EsProgramador = EsEmpleado


class EsLiderOAdmin(BasePermission):
    """
    Permite el acceso si el usuario es RRHH, Gerente, o es el Líder asignado al proyecto.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated or not hasattr(user, 'personal'):
            return False
        personal = user.personal
        if personal.rol in ['RRHH', 'GERENTE']:
            return True

        # Determinar el proyecto según la entidad evaluada
        proyecto = getattr(obj, 'proyecto', None)
        if hasattr(obj, 'empresa') and hasattr(obj, 'lider_proyecto'):
            proyecto = obj # el objeto mismo es un Proyecto

        if not proyecto:
            return False

        if proyecto.lider_proyecto_id == personal.id:
            return True

        return proyecto.equipo_asignaciones.filter(personal=personal, es_lider=True).exists()
