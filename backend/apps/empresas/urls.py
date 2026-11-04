from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmpresaViewSet, ContactoEmpresaViewSet

router = DefaultRouter()
router.register(r'contactos', ContactoEmpresaViewSet, basename='contacto')
router.register(r'', EmpresaViewSet, basename='empresa')

urlpatterns = [
    path('', include(router.urls)),
]
