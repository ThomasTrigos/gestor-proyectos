from django.db import migrations

def migrar_programadores_a_empleados(apps, schema_editor):
    Personal = apps.get_model('personal', 'Personal')
    actualizados = Personal.objects.filter(rol='PROGRAMADOR').update(rol='EMPLEADO')
    print(f"Migrados {actualizados} registros de PROGRAMADOR a EMPLEADO.")

def revertir_migracion(apps, schema_editor):
    Personal = apps.get_model('personal', 'Personal')
    Personal.objects.filter(rol='EMPLEADO').update(rol='PROGRAMADOR')

class Migration(migrations.Migration):

    dependencies = [
        ('personal', '0002_alter_personal_rol_invitacion'),
    ]

    operations = [
        migrations.RunPython(migrar_programadores_a_empleados, revertir_migracion),
    ]
