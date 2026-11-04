from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Empresa, ContactoEmpresa
from .serializers import EmpresaSerializer, ContactoEmpresaSerializer
from apps.personal.permissions import EsRRHH, EsRRHHoGerente

class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    filterset_fields = ['nombre_comercial', 'cuit']
    search_fields = ['razon_social', 'nombre_comercial']
    ordering_fields = ['nombre_comercial', 'razon_social', 'created_at', 'updated_at']

    def get_queryset(self):
        papelera = self.request.query_params.get('papelera', 'false').lower() == 'true'
        if papelera:
            return Empresa.objects.filter(eliminado=True).order_by('-fecha_eliminacion')
        return Empresa.objects.filter(eliminado=False).order_by('-created_at')

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [EsRRHHoGerente()]
        return [EsRRHH()]

    def perform_destroy(self, instance):
        instance.eliminado = True
        instance.fecha_eliminacion = timezone.now()
        user = self.request.user
        if hasattr(user, 'personal'):
            instance.eliminado_por = user.personal
        instance.save()

    @action(detail=True, methods=['post'], permission_classes=[EsRRHH])
    def restaurar(self, request, pk=None):
        try:
            empresa = Empresa.objects.get(pk=pk, eliminado=True)
        except Empresa.DoesNotExist:
            return Response({'error': 'La empresa no se encuentra en la papelera.'}, status=status.HTTP_404_NOT_FOUND)

        empresa.eliminado = False
        empresa.fecha_eliminacion = None
        empresa.eliminado_por = None
        empresa.save()
        return Response({'ok': True, 'mensaje': f'Empresa "{empresa.nombre_comercial}" restaurada exitosamente.'})

class ContactoEmpresaViewSet(viewsets.ModelViewSet):
    queryset = ContactoEmpresa.objects.all()
    serializer_class = ContactoEmpresaSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [EsRRHHoGerente()]
        return [EsRRHH()]

