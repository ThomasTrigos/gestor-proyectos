from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AdjuntoViewSet, AuditLogViewSet, RecordatorioViewSet, ConfiguracionEmailViewSet, ConfiguracionIAViewSet,
    metricas_proyectos_estado, metricas_tareas_programador,
    metricas_resumen_financiero, metricas_proximas_reuniones,
    metricas_carga_trabajo, metricas_proyectos_por_vencer,
    metricas_resumen_general
)

router = DefaultRouter()
router.register(r'adjuntos', AdjuntoViewSet)
router.register(r'audit', AuditLogViewSet, basename='audit')
router.register(r'auditoria', AuditLogViewSet, basename='auditoria')
router.register(r'recordatorios', RecordatorioViewSet)
router.register(r'configuracion-email', ConfiguracionEmailViewSet)
router.register(r'configuracion-ia', ConfiguracionIAViewSet)

urlpatterns = [
    path('metricas/proyectos-por-estado/', metricas_proyectos_estado),
    path('metricas/tareas-por-programador/', metricas_tareas_programador),
    path('metricas/resumen-financiero/', metricas_resumen_financiero),
    path('metricas/proximas-reuniones/', metricas_proximas_reuniones),
    path('metricas/carga-trabajo/', metricas_carga_trabajo),
    path('metricas/proyectos-por-vencer/', metricas_proyectos_por_vencer),
    path('metricas/resumen-general/', metricas_resumen_general),
    path('', include(router.urls)),
]
