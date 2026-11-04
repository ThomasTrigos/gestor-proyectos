from rest_framework import serializers
from .models import Empresa, ContactoEmpresa

class ContactoEmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactoEmpresa
        fields = '__all__'
        read_only_fields = ('empresa',)

class EmpresaSerializer(serializers.ModelSerializer):
    contactos = ContactoEmpresaSerializer(many=True)

    class Meta:
        model = Empresa
        fields = '__all__'

    def validate(self, data):
        contactos = self.initial_data.get('contactos', [])
        if not contactos:
            raise serializers.ValidationError({"contactos": "Debe proporcionar al menos un contacto."})
        return data

    def create(self, validated_data):
        contactos_data = validated_data.pop('contactos', [])
        empresa = Empresa.objects.create(**validated_data)
        for c_data in contactos_data:
            c_dict = dict(c_data)
            c_dict.pop('id', None)
            c_dict.pop('empresa', None)
            ContactoEmpresa.objects.create(empresa=empresa, **c_dict)
        return empresa

    def update(self, instance, validated_data):
        contactos_data = validated_data.pop('contactos', None)
        if contactos_data is not None:
            instance.contactos.all().delete()
            for c_data in contactos_data:
                c_dict = dict(c_data)
                c_dict.pop('id', None)
                c_dict.pop('empresa', None)
                ContactoEmpresa.objects.create(empresa=instance, **c_dict)
        return super().update(instance, validated_data)
