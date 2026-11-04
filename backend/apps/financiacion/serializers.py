from rest_framework import serializers
from .models import Financiacion, CuotaPago

class CuotaPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CuotaPago
        fields = [
            'id', 'financiacion', 'tipo_pago', 'numero_cuota',
            'entregable', 'detalle', 'monto', 'monto_pagado',
            'moneda', 'fecha_pago', 'fecha_vencimiento', 'fecha_aviso',
            'modalidad', 'estado', 'comprobante',
            'pago_en_dolares', 'monto_usd', 'cotizacion_usd'
        ]
        extra_kwargs = {
            'financiacion': {'required': False}
        }

class FinanciacionSerializer(serializers.ModelSerializer):
    cuotas = CuotaPagoSerializer(many=True, required=False)
    proyecto_nombre = serializers.SerializerMethodField()
    empresa_id = serializers.SerializerMethodField()
    empresa_nombre = serializers.SerializerMethodField()
    tipo_trabajo_display = serializers.SerializerMethodField()

    class Meta:
        model = Financiacion
        fields = [
            'id', 'empresa', 'empresa_id', 'empresa_nombre',
            'proyecto', 'proyecto_nombre',
            'tipo_trabajo', 'tipo_trabajo_otro', 'tipo_trabajo_display',
            'monto_total', 'monto_usd', 'cotizacion_usd', 'moneda', 'forma_pago', 'cantidad_cuotas',
            'detalle_entregables', 'detalle_otros', 'fecha_acuerdo',
            'notas', 'aviso_email_empresa', 'recordatorio_verificar_cobro',
            'created_at', 'updated_at', 'cuotas'
        ]
        extra_kwargs = {
            'forma_pago': {'required': False}
        }

    def get_proyecto_nombre(self, obj):
        return obj.proyecto.nombre if obj.proyecto else None

    def get_empresa_id(self, obj):
        if obj.empresa:
            return obj.empresa.id
        if obj.proyecto and obj.proyecto.empresa:
            return obj.proyecto.empresa.id
        return None

    def get_empresa_nombre(self, obj):
        if obj.empresa:
            return obj.empresa.nombre_comercial or obj.empresa.razon_social
        if obj.proyecto and obj.proyecto.empresa:
            return obj.proyecto.empresa.nombre_comercial or obj.proyecto.empresa.razon_social
        return None

    def get_tipo_trabajo_display(self, obj):
        if obj.tipo_trabajo == 'OTRO' and obj.tipo_trabajo_otro:
            return f"Otro ({obj.tipo_trabajo_otro})"
        return obj.get_tipo_trabajo_display()

    def validate(self, data):
        tipo_trabajo = data.get('tipo_trabajo')
        tipo_trabajo_otro = data.get('tipo_trabajo_otro')
        if tipo_trabajo == 'OTRO' and not tipo_trabajo_otro:
            raise serializers.ValidationError({
                'tipo_trabajo_otro': 'Debe especificar el tipo de trabajo cuando se selecciona "Otro".'
            })
        return data

    def create(self, validated_data):
        cuotas_data = validated_data.pop('cuotas', None)
        financiacion = Financiacion.objects.create(**validated_data)
        
        if cuotas_data:
            for idx, c_data in enumerate(cuotas_data):
                c_data['moneda'] = c_data.get('moneda') or financiacion.moneda
                if c_data.get('tipo_pago') == 'CUOTA' and not c_data.get('numero_cuota'):
                    c_data['numero_cuota'] = idx + 1
                CuotaPago.objects.create(
                    financiacion=financiacion,
                    **c_data
                )
        return financiacion

    def update(self, instance, validated_data):
        cuotas_data = validated_data.pop('cuotas', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if cuotas_data is not None:
            # Reemplazar cuotas por el nuevo conjunto enviado
            instance.cuotas.all().delete()
            for idx, c_data in enumerate(cuotas_data):
                c_data['moneda'] = c_data.get('moneda') or instance.moneda
                if c_data.get('tipo_pago') == 'CUOTA' and not c_data.get('numero_cuota'):
                    c_data['numero_cuota'] = idx + 1
                CuotaPago.objects.create(
                    financiacion=instance,
                    **c_data
                )
        return instance


