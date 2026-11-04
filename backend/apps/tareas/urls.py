from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TareaViewSet, TareaConfirmacionView, MisTareasView

router = DefaultRouter()
router.register(r'confirmar', TareaConfirmacionView, basename='tarea-confirmacion')
router.register(r'mis-tareas', MisTareasView, basename='mis-tareas')
router.register(r'', TareaViewSet, basename='tarea')

urlpatterns = [
    path('', include(router.urls)),
]
