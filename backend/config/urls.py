from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from apps.personal.views import (
    LoginView, LogoutView, InvitacionViewSet, ValidarInvitacionView, CompletarRegistroView
)
from apps.financiacion.views import CuotaPagoViewSet
from apps.core.views import RecordatorioViewSet, ConfiguracionEmailViewSet, ConfiguracionIAViewSet

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', LoginView.as_view(), name='auth_login'),
    path('api/auth/logout/', LogoutView.as_view(), name='auth_logout'),
    path('api/token/', LoginView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    path('api/core/', include('apps.core.urls')),
    path('api/', include('apps.core.urls')),
    path('api/empresas/', include('apps.empresas.urls')),
    path('api/personal/', include('apps.personal.urls')),
    path('api/proyectos/', include('apps.proyectos.urls')),
    path('api/tareas/', include('apps.tareas.urls')),
    path('api/reuniones/', include('apps.reuniones.urls')),
    path('api/financiacion/', include('apps.financiacion.urls')),
    path('api/cuotas/', CuotaPagoViewSet.as_view({'get': 'list', 'post': 'create'}), name='cuotas_list'),
    path('api/cuotas/<uuid:pk>/', CuotaPagoViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='cuotas_detail'),
    path('api/recordatorios/', RecordatorioViewSet.as_view({'get': 'list', 'post': 'create'}), name='recordatorios_list'),
    path('api/recordatorios/<uuid:pk>/', RecordatorioViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='recordatorios_detail'),
    path('api/recordatorios/<uuid:pk>/toggle_completado/', RecordatorioViewSet.as_view({'post': 'toggle_completado'}), name='recordatorios_toggle'),
    path('api/configuracion-email/', ConfiguracionEmailViewSet.as_view({'get': 'list', 'post': 'create'}), name='configuracion_email_list'),
    path('api/configuracion-email/activa/', ConfiguracionEmailViewSet.as_view({'get': 'activa'}), name='configuracion_email_activa'),
    path('api/configuracion-email/probar/', ConfiguracionEmailViewSet.as_view({'post': 'probar'}), name='configuracion_email_probar'),
    path('api/configuracion-email/<uuid:pk>/', ConfiguracionEmailViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='configuracion_email_detail'),
    path('api/configuracion-ia/', ConfiguracionIAViewSet.as_view({'get': 'list', 'post': 'create'}), name='configuracion_ia_list'),
    path('api/configuracion-ia/proveedores/', ConfiguracionIAViewSet.as_view({'get': 'proveedores'}), name='configuracion_ia_proveedores'),
    path('api/configuracion-ia/probar/', ConfiguracionIAViewSet.as_view({'post': 'probar'}), name='configuracion_ia_probar'),
    path('api/configuracion-ia/<uuid:pk>/', ConfiguracionIAViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='configuracion_ia_detail'),
    path('api/configuracion-ia/<uuid:pk>/establecer_predeterminado/', ConfiguracionIAViewSet.as_view({'post': 'establecer_predeterminado'}), name='configuracion_ia_predeterminado'),
    path('api/invitaciones/', InvitacionViewSet.as_view({'get': 'list', 'post': 'create'}), name='invitaciones_list'),
    path('api/invitaciones/validar/', ValidarInvitacionView.as_view(), name='invitaciones_validar_root'),
    path('api/invitaciones/completar/', CompletarRegistroView.as_view(), name='invitaciones_completar_root'),
    path('api/invitaciones/<uuid:pk>/', InvitacionViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'}), name='invitaciones_detail'),
    path('api/invitaciones/<uuid:pk>/reenviar/', InvitacionViewSet.as_view({'post': 'reenviar'}), name='invitaciones_reenviar'),
    path('api/invitaciones/<uuid:pk>/revocar/', InvitacionViewSet.as_view({'post': 'revocar'}), name='invitaciones_revocar'),
    path('api/invitaciones/<uuid:pk>/aprobar/', InvitacionViewSet.as_view({'post': 'aprobar'}), name='invitaciones_aprobar'),
]

from django.urls import re_path
from django.views.static import serve

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

