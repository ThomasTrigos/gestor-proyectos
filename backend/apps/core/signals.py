from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.apps import apps
from apps.core.models import AuditLog
from apps.core.middleware import get_current_user

APPS_AUDITADAS = {'empresas', 'proyectos', 'tareas', 'reuniones', 'financiacion', 'personal'}

def get_personal_from_user(user):
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    try:
        return getattr(user, 'personal', None)
    except Exception:
        return None

# Guardar valores anteriores en una variable temporal del objeto
@receiver(pre_save)
def capture_old_values(sender, instance, **kwargs):
    if kwargs.get('raw', False) or sender._meta.app_label not in APPS_AUDITADAS:
        return
    
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            instance._old_values = {field.name: getattr(old_instance, field.name) for field in sender._meta.fields}
        except Exception:
            instance._old_values = {}
    else:
        instance._old_values = {}

@receiver(post_save)
def log_save(sender, instance, created, **kwargs):
    if kwargs.get('raw', False) or sender._meta.app_label not in APPS_AUDITADAS:
        return

    try:
        user = get_current_user()
        personal = get_personal_from_user(user)
        
        if created:
            AuditLog.objects.create(
                tabla=sender._meta.db_table,
                registro_id=instance.pk,
                accion='CREAR',
                usuario_id=personal
            )
        else:
            if hasattr(instance, '_old_values'):
                for field in sender._meta.fields:
                    field_name = field.name
                    new_value = getattr(instance, field_name)
                    old_value = instance._old_values.get(field_name)
                    
                    if old_value != new_value:
                        AuditLog.objects.create(
                            tabla=sender._meta.db_table,
                            registro_id=instance.pk,
                            accion='MODIFICAR',
                            campo=field_name,
                            valor_anterior=str(old_value) if old_value is not None else None,
                            valor_nuevo=str(new_value) if new_value is not None else None,
                            usuario_id=personal
                        )
    except Exception:
        # Prevent database logging from breaking transactions during migrations/tests
        pass

@receiver(post_delete)
def log_delete(sender, instance, **kwargs):
    if kwargs.get('raw', False) or sender._meta.app_label not in APPS_AUDITADAS:
        return

    try:
        user = get_current_user()
        personal = get_personal_from_user(user)
        
        AuditLog.objects.create(
            tabla=sender._meta.db_table,
            registro_id=instance.pk,
            accion='ELIMINAR',
            usuario_id=personal
        )
    except Exception:
        pass

