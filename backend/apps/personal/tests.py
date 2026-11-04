from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from .models import Personal


class MiPerfilTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_empleado = User.objects.create_user(
            username='empleado_test',
            email='empleado_test@ejemplo.com',
            password='password123',
            first_name='Carlos',
            last_name='Gomez'
        )
        self.personal_empleado = Personal.objects.create(
            user=self.user_empleado,
            nombre='Carlos',
            apellido='Gomez',
            email='empleado_test@ejemplo.com',
            telefono='1122334455',
            cargo='Desarrollador',
            rol='EMPLEADO',
            fecha_ingreso=timezone.now().date(),
            activo=True
        )

        self.otro_usuario = User.objects.create_user(
            username='otro_test',
            email='otro@ejemplo.com',
            password='password123'
        )
        self.otro_personal = Personal.objects.create(
            user=self.otro_usuario,
            nombre='Otro',
            apellido='User',
            email='otro@ejemplo.com',
            cargo='Analista',
            rol='EMPLEADO',
            fecha_ingreso=timezone.now().date(),
            activo=True
        )

    def test_empleado_puede_consultar_su_perfil(self):
        self.client.force_authenticate(user=self.user_empleado)
        response = self.client.get('/api/personal/mi_perfil/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'empleado_test@ejemplo.com')
        self.assertEqual(response.data['telefono'], '1122334455')
        self.assertEqual(response.data['nombre'], 'Carlos')

    def test_empleado_puede_actualizar_sus_medios_de_contacto(self):
        self.client.force_authenticate(user=self.user_empleado)
        response = self.client.patch('/api/personal/mi_perfil/', {
            'telefono': '+54 9 11 9988-7766',
            'email': 'carlos.actualizado@ejemplo.com'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.personal_empleado.refresh_from_db()
        self.user_empleado.refresh_from_db()
        self.assertEqual(self.personal_empleado.telefono, '+54 9 11 9988-7766')
        self.assertEqual(self.personal_empleado.email, 'carlos.actualizado@ejemplo.com')
        self.assertEqual(self.user_empleado.email, 'carlos.actualizado@ejemplo.com')

    def test_email_duplicado_rechazado(self):
        self.client.force_authenticate(user=self.user_empleado)
        response = self.client.patch('/api/personal/mi_perfil/', {
            'email': 'otro@ejemplo.com'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_usuario_sin_personal_puede_consultar_y_actualizar(self):
        admin = User.objects.create_superuser(
            username='admin_sin_personal',
            email='admin@ejemplo.com',
            password='password123'
        )
        self.client.force_authenticate(user=admin)
        get_res = self.client.get('/api/personal/mi_perfil/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)

        patch_res = self.client.patch('/api/personal/mi_perfil/', {
            'telefono': '555-1234',
            'nombre': 'Admin Master'
        })
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        admin.refresh_from_db()
        self.assertEqual(admin.first_name, 'Admin Master')
