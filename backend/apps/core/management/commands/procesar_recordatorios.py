from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.core.models import Recordatorio
from apps.core.services.email_service import enviar_email_recordatorio


class Command(BaseCommand):
    help = 'Procesa y despacha por correo electrónico los recordatorios programados que han alcanzado su fecha y hora'

    def handle(self, *args, **options):
        ahora = timezone.localtime()
        hoy = ahora.date()
        hora_actual = ahora.time()

        # Buscar recordatorios pendientes para hoy o fechas anteriores
        recordatorios = Recordatorio.objects.filter(
            enviar_email_futuro=True,
            email_enviado=False,
            fecha__lte=hoy
        )

        enviados = 0
        errores = 0

        for rec in recordatorios:
            # Si es para hoy pero con hora futura, omitir hasta que se cumpla la hora
            if rec.fecha == hoy and rec.hora and rec.hora > hora_actual:
                continue

            try:
                exito = enviar_email_recordatorio(rec)
                if exito:
                    enviados += 1
                    self.stdout.write(self.style.SUCCESS(f"Recordatorio '{rec.titulo}' enviado a {rec.email_destino}."))
                else:
                    errores += 1
                    self.stdout.write(self.style.WARNING(f"No se pudo enviar recordatorio '{rec.titulo}' (sin destinatario válido)."))
            except Exception as e:
                errores += 1
                self.stdout.write(self.style.ERROR(f"Error despachando recordatorio {rec.id}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"Procesamiento finalizado. Enviados: {enviados}, Errores/Omitidos: {errores}."))
