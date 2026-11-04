from rest_framework import serializers
from .models import Adjunto, AuditLog, Recordatorio, ConfiguracionEmail, ConfiguracionIA

MAX_ADJUNTO_SIZE = 5 * 1024 * 1024  # 5 MB
EXTENSIONES_PROHIBIDAS = {'.exe', '.bat', '.cmd', '.sh', '.php', '.py', '.js', '.vbs', '.msi', '.com', '.scr', '.pif'}

class AdjuntoSerializer(serializers.ModelSerializer):
    subido_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Adjunto
        fields = '__all__'
        read_only_fields = ['id', 'subido_por', 'created_at']

    def get_subido_por_nombre(self, obj):
        if obj.subido_por:
            return f"{obj.subido_por.nombre} {obj.subido_por.apellido}".strip()
        return None

    def validate(self, attrs):
        archivo = attrs.get('archivo')
        enlace_externo = attrs.get('enlace_externo')

        if not archivo and not enlace_externo:
            raise serializers.ValidationError(
                "Debe proporcionar un archivo físico (máximo 5 MB) o un enlace externo a Google Drive/OneDrive."
            )

        if archivo:
            # Validar límite estricto de 5 MB
            if archivo.size > MAX_ADJUNTO_SIZE:
                raise serializers.ValidationError({
                    "archivo": "El archivo supera el límite de 5 MB. Por favor cargue el archivo en Google Drive e ingrese el enlace correspondiente."
                })

            # Validar extensiones de riesgo
            import os
            ext = os.path.splitext(archivo.name)[1].lower()
            if ext in EXTENSIONES_PROHIBIDAS:
                raise serializers.ValidationError({
                    "archivo": f"Los archivos con extensión '{ext}' no están permitidos por políticas de seguridad."
                })

            # Validar firmas binarias sospechosas (ejecutables camuflados con otra extensión)
            try:
                pos = archivo.tell()
                header = archivo.read(4)
                archivo.seek(pos)
                if header.startswith(b'MZ') or header.startswith(b'\x7fELF'):
                    raise serializers.ValidationError({
                        "archivo": "El archivo contiene una cabecera de ejecutable binario no permitida por seguridad."
                    })
            except (AttributeError, IOError):
                pass

            attrs['tamanio'] = archivo.size
            if not attrs.get('nombre_original'):
                attrs['nombre_original'] = archivo.name
            if not attrs.get('tipo_mime') and hasattr(archivo, 'content_type'):
                attrs['tipo_mime'] = archivo.content_type

        elif enlace_externo:
            if not attrs.get('nombre_original'):
                attrs['nombre_original'] = 'Enlace a Google Drive / Almacenamiento Externo'
            attrs['tamanio'] = 0
            attrs['tipo_mime'] = 'text/uri-list'

        return attrs

class AuditLogSerializer(serializers.ModelSerializer):
    fecha_hora = serializers.DateTimeField(source='fecha', read_only=True)
    tabla_afectada = serializers.CharField(source='tabla', read_only=True)
    usuario_nombre = serializers.SerializerMethodField()
    campos_modificados = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'tabla', 'tabla_afectada', 'registro_id', 'accion',
            'campo', 'valor_anterior', 'valor_nuevo', 'campos_modificados',
            'usuario_id', 'usuario_nombre', 'fecha', 'fecha_hora', 'ip_address'
        ]

    def get_usuario_nombre(self, obj):
        if obj.usuario_id:
            return f"{obj.usuario_id.nombre} {obj.usuario_id.apellido}".strip()
        return None

    def get_campos_modificados(self, obj):
        if obj.campo:
            return {
                obj.campo: {
                    'anterior': obj.valor_anterior,
                    'nuevo': obj.valor_nuevo
                }
            }
        return None

class RecordatorioSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()
    usuario_email = serializers.SerializerMethodField()

    class Meta:
        model = Recordatorio
        fields = '__all__'
        extra_kwargs = {
            'usuario': {'required': False}
        }

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return f"{obj.usuario.nombre} {obj.usuario.apellido}".strip()
        return None

    def get_usuario_email(self, obj):
        if obj.usuario:
            return obj.usuario.email
        return None


class ConfiguracionEmailSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    tiene_password = serializers.SerializerMethodField()

    class Meta:
        model = ConfiguracionEmail
        fields = [
            'id', 'proveedor', 'host', 'port', 'usuario',
            'password', 'tiene_password',
            'use_tls', 'use_ssl', 'remitente_default',
            'activo', 'created_at', 'updated_at'
        ]

    def get_tiene_password(self, obj) -> bool:
        return bool(obj.password_cifrado)

    def create(self, validated_data):
        password_plano = validated_data.pop('password', '')
        instance = ConfiguracionEmail(**validated_data)
        if password_plano:
            instance.set_password(password_plano)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        password_plano = validated_data.pop('password', None)
        if password_plano:
            instance.set_password(password_plano)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ProbarEmailSerializer(serializers.Serializer):
    email_destino = serializers.EmailField(required=True)


class ConfiguracionIASerializer(serializers.ModelSerializer):
    api_key = serializers.CharField(write_only=True, required=False, allow_blank=True)
    mascara_api_key = serializers.ReadOnlyField()
    tiene_api_key = serializers.ReadOnlyField()
    activo = serializers.BooleanField(default=True, required=False)
    es_predeterminado = serializers.BooleanField(default=False, required=False)

    class Meta:
        model = ConfiguracionIA
        fields = [
            'id', 'proveedor', 'nombre', 'modelo',
            'api_key', 'mascara_api_key', 'tiene_api_key',
            'es_predeterminado', 'activo', 'temperatura', 'max_tokens',
            'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        api_key_plana = validated_data.pop('api_key', '')
        instance = ConfiguracionIA(**validated_data)
        if api_key_plana:
            instance.set_api_key(api_key_plana)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        api_key_plana = validated_data.pop('api_key', None)
        if api_key_plana is not None and api_key_plana != '':
            instance.set_api_key(api_key_plana)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ProbarIASerializer(serializers.Serializer):
    proveedor = serializers.ChoiceField(choices=ConfiguracionIA.PROVEEDORES)
    api_key = serializers.CharField(required=False, allow_blank=True)
    modelo = serializers.CharField(required=False, allow_blank=True)
    id = serializers.UUIDField(required=False, allow_null=True)


