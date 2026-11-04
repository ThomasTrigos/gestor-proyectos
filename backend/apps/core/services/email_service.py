import logging
from django.core.mail import get_connection, EmailMultiAlternatives
from django.conf import settings
from django.utils.html import escape

logger = logging.getLogger(__name__)


def obtener_conexion_email(config_especifica=None):
    """
    Retorna una tupla (conexion, remitente_default).
    Si se pasa config_especifica o si existe una ConfiguracionEmail activa en BD,
    construye una conexión SMTP dinámica descifrando las credenciales.
    En caso contrario, recurre a la configuración global de Django settings.
    """
    try:
        from apps.core.models import ConfiguracionEmail
        config = config_especifica or ConfiguracionEmail.objects.filter(activo=True).first()
        if config:
            password = config.get_password()
            conexion = get_connection(
                backend='django.core.mail.backends.smtp.EmailBackend',
                host=config.host,
                port=config.port,
                username=config.usuario,
                password=password,
                use_tls=config.use_tls,
                use_ssl=config.use_ssl,
                timeout=10,
            )
            remitente = config.remitente_default or config.usuario
            return conexion, remitente
    except Exception as e:
        logger.warning(f"No se pudo cargar la configuración de email activa de BD: {e}")

    remitente_global = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@gestorproyectos.com')
    return None, remitente_global


def enviar_email_tarea(tarea, ics_content=None):
    asunto = f"Nueva tarea asignada: {tarea.titulo}"
    token = getattr(tarea, 'token_confirmacion', None) or (tarea.asignado_a.token_confirmacion if tarea.asignado_a else '')
    url_confirmacion = f"{settings.FRONTEND_URL}/tareas/{tarea.id}/confirmar?token={token}"
    
    nombre_seguro = escape(tarea.asignado_a.nombre) if tarea.asignado_a else 'Estimado/a'
    proyecto_seguro = escape(tarea.proyecto.nombre) if tarea.proyecto else '-'
    titulo_seguro = escape(tarea.titulo)
    descripcion_segura = escape(tarea.descripcion or '')
    
    fecha_inicio_html = f"<p><strong>Fecha de Inicio:</strong> {tarea.fecha_inicio}</p>" if tarea.fecha_inicio else ""
    mensaje_html = f"""
    <h2>Hola {nombre_seguro},</h2>
    <p>Se te ha asignado una nueva tarea en el proyecto <strong>{proyecto_seguro}</strong>.</p>
    <p><strong>Título:</strong> {titulo_seguro}</p>
    <p><strong>Descripción:</strong> {descripcion_segura}</p>
    <p><strong>Prioridad:</strong> {tarea.get_prioridad_display()}</p>
    {fecha_inicio_html}
    <p><strong>Fecha Límite:</strong> {tarea.fecha_limite}</p>
    <br>
    <a href="{url_confirmacion}" style="padding:10px 15px; background-color:#28a745; color:white; text-decoration:none; border-radius:5px;">Confirmar Lectura</a>
    """
    
    conexion, remitente = obtener_conexion_email()
    msg = EmailMultiAlternatives(
        subject=asunto,
        body="Por favor, visualice este email en un cliente que soporte HTML.",
        from_email=remitente,
        to=[tarea.asignado_a.email],
        connection=conexion
    )
    msg.attach_alternative(mensaje_html, "text/html")
    
    if ics_content:
        msg.attach('tarea.ics', ics_content, 'text/calendar')
        
    try:
        msg.send(fail_silently=True)
    except Exception as e:
        logger.error(f"Error al enviar email de tarea: {e}")


def enviar_email_reunion(reunion, ics_content=None):
    asunto = f"Invitación a reunión: {reunion.titulo}"
    conexion, remitente = obtener_conexion_email()
    titulo_seguro = escape(reunion.titulo)
    proyecto_seguro = escape(reunion.proyecto.nombre if reunion.proyecto else '-')
    descripcion_segura = escape(reunion.descripcion or '')
    ubicacion_segura = escape(reunion.ubicacion or '-')
    
    for partic_int in reunion.participantes_internos.all():
        personal = partic_int.personal
        nombre_seguro = escape(personal.nombre)
        mensaje_html = f"""
        <h2>Hola {nombre_seguro},</h2>
        <p>Has sido invitado a una reunión del proyecto <strong>{proyecto_seguro}</strong>.</p>
        <p><strong>Título:</strong> {titulo_seguro}</p>
        <p><strong>Descripción:</strong> {descripcion_segura}</p>
        <p><strong>Fecha y Hora:</strong> {reunion.fecha_hora_inicio} a {reunion.fecha_hora_fin}</p>
        <p><strong>Ubicación/Link:</strong> {ubicacion_segura}</p>
        """
        
        msg = EmailMultiAlternatives(
            subject=asunto,
            body="Por favor, visualice este email en un cliente que soporte HTML.",
            from_email=remitente,
            to=[personal.email],
            connection=conexion
        )
        msg.attach_alternative(mensaje_html, "text/html")
        if ics_content:
            msg.attach('reunion.ics', ics_content, 'text/calendar')
        try:
            msg.send(fail_silently=True)
        except Exception as e:
            logger.error(f"Error al enviar email reunión a {personal.email}: {e}")
        
    for partic_ext in reunion.participantes_externos.all():
        if partic_ext.email:
            nombre_ext_seguro = escape(partic_ext.nombre)
            mensaje_html = f"""
            <h2>Hola {nombre_ext_seguro},</h2>
            <p>Has sido invitado a una reunión del proyecto <strong>{proyecto_seguro}</strong>.</p>
            <p><strong>Título:</strong> {titulo_seguro}</p>
            <p><strong>Descripción:</strong> {descripcion_segura}</p>
            <p><strong>Fecha y Hora:</strong> {reunion.fecha_hora_inicio} a {reunion.fecha_hora_fin}</p>
            <p><strong>Ubicación/Link:</strong> {ubicacion_segura}</p>
            """
            msg = EmailMultiAlternatives(
                subject=asunto,
                body="Por favor, visualice este email en un cliente que soporte HTML.",
                from_email=remitente,
                to=[partic_ext.email],
                connection=conexion
            )
            msg.attach_alternative(mensaje_html, "text/html")
            if ics_content:
                msg.attach('reunion.ics', ics_content, 'text/calendar')
            try:
                msg.send(fail_silently=True)
            except Exception as e:
                logger.error(f"Error al enviar email reunión a externo {partic_ext.email}: {e}")


def enviar_email_equipo(proyecto, personal):
    asunto = f"Asignación al proyecto: {proyecto.nombre}"
    token = personal.token_confirmacion
    url = f"{settings.FRONTEND_URL}/proyectos/{proyecto.id}?token={token}"
    nombre_seguro = escape(personal.nombre)
    proyecto_seguro = escape(proyecto.nombre)
    
    mensaje_html = f"""
    <h2>Hola {nombre_seguro},</h2>
    <p>Has sido asignado al proyecto <strong>{proyecto_seguro}</strong>.</p>
    <br>
    <a href="{url}" style="padding:10px 15px; background-color:#007bff; color:white; text-decoration:none; border-radius:5px;">Ver Proyecto</a>
    """
    
    conexion, remitente = obtener_conexion_email()
    msg = EmailMultiAlternatives(
        subject=asunto,
        body="Por favor, visualice este email en un cliente que soporte HTML.",
        from_email=remitente,
        to=[personal.email],
        connection=conexion
    )
    msg.attach_alternative(mensaje_html, "text/html")
    try:
        msg.send(fail_silently=True)
    except Exception as e:
        logger.error(f"Error al enviar email equipo a {personal.email}: {e}")


def enviar_email_recordatorio(recordatorio):
    destinatario = recordatorio.email_destino or (recordatorio.usuario.email if recordatorio.usuario else None)
    if not destinatario:
        return False

    asunto = f"⏰ Recordatorio: {recordatorio.titulo}"
    hora_str = f" a las {recordatorio.hora.strftime('%H:%M')}" if recordatorio.hora else ""
    nombre_seguro = escape(recordatorio.usuario.nombre) if recordatorio.usuario else ''
    titulo_seguro = escape(recordatorio.titulo)
    descripcion_segura = escape(recordatorio.descripcion or '')
    
    mensaje_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-top: 0;">⏰ Recordatorio / Nota Programada</h2>
        <p>Hola <strong>{nombre_seguro}</strong>,</p>
        <p>Te enviamos la nota que programaste para recordar:</p>
        <div style="background-color: #f8fafc; padding: 16px; border-left: 4px solid #4f46e5; border-radius: 4px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px;">{titulo_seguro}</h3>
            {f'<p style="margin: 0; color: #475569; font-size: 14px; white-space: pre-wrap;">{descripcion_segura}</p>' if recordatorio.descripcion else ''}
        </div>
        <p style="font-size: 13px; color: #64748b;">
            📅 <strong>Fecha programada:</strong> {recordatorio.fecha}{hora_str}<br>
            ⭐ <strong>Prioridad:</strong> {recordatorio.get_prioridad_display()}
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            Gestor de Proyectos — Notificación automática de recordatorios.
        </p>
    </div>
    """
    
    conexion, remitente = obtener_conexion_email()
    if conexion is None:
        from apps.core.models import ConfiguracionEmail
        if not ConfiguracionEmail.objects.filter(activo=True).exists():
            logger.warning("No hay servidor SMTP activo en la base de datos para enviar el recordatorio.")
            return False

    msg = EmailMultiAlternatives(
        subject=asunto,
        body=f"Recordatorio: {recordatorio.titulo}\n\n{recordatorio.descripcion or ''}\n\nFecha: {recordatorio.fecha}{hora_str}",
        from_email=remitente,
        to=[destinatario],
        connection=conexion
    )
    msg.attach_alternative(mensaje_html, "text/html")
    try:
        sent = msg.send(fail_silently=False)
        if sent:
            recordatorio.email_enviado = True
            recordatorio.save(update_fields=['email_enviado'])
        return True
    except Exception as e:
        logger.error(f"Error al enviar email recordatorio: {e}")
        return False


def enviar_email_prueba(destinatario: str, config=None):
    """
    Envía un email real de prueba a la casilla especificada para validar credenciales SMTP.
    Lanza excepción o retorna (exito: bool, mensaje: str).
    """
    asunto = "✅ Prueba de Envío de Email — Gestor de Proyectos"
    mensaje_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #10b981; border-radius: 8px;">
        <h2 style="color: #059669; margin-top: 0;">🎉 ¡Conexión SMTP Exitosa!</h2>
        <p>Este es un correo real de verificación enviado desde tu plataforma de <strong>Gestor de Proyectos</strong>.</p>
        <div style="background-color: #ecfdf5; padding: 16px; border-left: 4px solid #10b981; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; color: #065f46; font-size: 14px;">
                Tus credenciales de correo configuradas son válidas y están debidamente cifradas en la base de datos con AES/Fernet.
            </p>
        </div>
        <p style="font-size: 13px; color: #64748b;">
            A partir de ahora, todas las invitaciones a miembros, asignaciones de tareas y recordatorios de proyectos llegarán de forma real a las bandejas de entrada de los usuarios.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            Gestor de Proyectos — Notificación de prueba SMTP.
        </p>
    </div>
    """

    conexion, remitente = obtener_conexion_email(config_especifica=config)
    if not conexion:
        raise ValueError("No hay una configuración SMTP activa ni parámetros válidos de conexión.")

    msg = EmailMultiAlternatives(
        subject=asunto,
        body="Prueba de conexión exitosa desde el Gestor de Proyectos.",
        from_email=remitente,
        to=[destinatario],
        connection=conexion
    )
    msg.attach_alternative(mensaje_html, "text/html")
    # Para la prueba, NO usamos fail_silently para capturar cualquier error exacto de autenticación
    msg.send(fail_silently=False)
    return True


def enviar_email_invitacion(invitacion, request=None):
    """
    Envía una invitación formal de registro al correo del nuevo miembro con enlace de activación temporal (48h).
    """
    asunto = "✉️ Invitación para unirte a Gestor de Proyectos"
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    if request:
        origin = request.headers.get('Origin') or request.headers.get('Referer')
        if origin:
            from urllib.parse import urlparse
            parsed = urlparse(origin)
            if parsed.scheme and parsed.netloc:
                frontend_url = f"{parsed.scheme}://{parsed.netloc}"

    url_activacion = f"{frontend_url}/activar-cuenta?token={invitacion.token}"
    fecha_expira_str = invitacion.fecha_expiracion.strftime('%d/%m/%Y a las %H:%M hs')

    nombre_seguro = escape(invitacion.nombre)
    apellido_seguro = escape(invitacion.apellido)
    cargo_seguro = escape(invitacion.cargo)
    rol_seguro = escape(invitacion.get_rol_display())
    email_seguro = escape(invitacion.email)

    mensaje_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0; font-size: 22px;">👋 ¡Hola {nombre_seguro}!</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.5;">
            Has sido invitado a incorporarte a la plataforma de <strong>Gestor de Proyectos</strong> con el cargo de <strong>{cargo_seguro}</strong> ({rol_seguro}).
        </p>
        <div style="background-color: #f1f5f9; padding: 18px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4f46e5;">
            <p style="margin: 0 0 8px 0; color: #1e293b; font-size: 14px;"><strong>Detalles de tu invitación:</strong></p>
            <p style="margin: 0; color: #475569; font-size: 13px;">
                👤 <strong>Nombre:</strong> {nombre_seguro} {apellido_seguro}<br>
                📧 <strong>Email de acceso:</strong> {email_seguro}<br>
                💼 <strong>Rol:</strong> {rol_seguro}<br>
                ⏳ <strong>Validez:</strong> 48 horas (Vence el {fecha_expira_str})
            </p>
        </div>
        <p style="color: #334155; font-size: 14px;">
            Haz clic en el siguiente botón para establecer tu contraseña y completar tu registro:
        </p>
        <div style="text-align: center; margin: 28px 0;">
            <a href="{url_activacion}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
                Completar Registro y Activar Cuenta
            </a>
        </div>
        <p style="color: #64748b; font-size: 12px;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
            <a href="{url_activacion}" style="color: #4f46e5; word-break: break-all;">{url_activacion}</a>
        </p>
        <p style="color: #e11d48; font-size: 12px; font-weight: 500;">
            ⚠️ Este enlace es de un solo uso y vencerá en 48 horas. Una vez completado tu registro, el área de Recursos Humanos confirmará la activación de tu usuario.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            Gestor de Proyectos — Sistema interno de gestión colaborativa.
        </p>
    </div>
    """

    conexion, remitente = obtener_conexion_email()
    msg = EmailMultiAlternatives(
        subject=asunto,
        body=f"Invitación para unirte a Gestor de Proyectos:\n\nHola {invitacion.nombre}, completa tu registro ingresando a:\n{url_activacion}\n\nEste enlace expira el {fecha_expira_str}.",
        from_email=remitente,
        to=[invitacion.email],
        connection=conexion
    )
    msg.attach_alternative(mensaje_html, "text/html")
    try:
        msg.send(fail_silently=True)
        return True
    except Exception as e:
        logger.error(f"Error al enviar email de invitación a {invitacion.email}: {e}")
        return False
