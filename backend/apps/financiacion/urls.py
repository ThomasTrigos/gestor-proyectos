from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FinanciacionViewSet, CuotaPagoViewSet

router = DefaultRouter()
router.register(r'cuotas', CuotaPagoViewSet, basename='cuota')
router.register(r'', FinanciacionViewSet, basename='financiacion')

urlpatterns = [
    path('', include(router.urls)),
]
