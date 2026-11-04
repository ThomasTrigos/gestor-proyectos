from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView, LogoutView,
    PersonalViewSet, InvitacionViewSet,
    ValidarInvitacionView, CompletarRegistroView
)

router = DefaultRouter()
router.register(r'invitaciones', InvitacionViewSet, basename='invitaciones')
router.register(r'', PersonalViewSet, basename='personal')

urlpatterns = [
    path('login/', LoginView.as_view(), name='personal_login'),
    path('logout/', LogoutView.as_view(), name='personal_logout'),
    path('invitaciones/validar/', ValidarInvitacionView.as_view(), name='invitaciones_validar'),
    path('invitaciones/completar/', CompletarRegistroView.as_view(), name='invitaciones_completar'),
    path('', include(router.urls)),
]
