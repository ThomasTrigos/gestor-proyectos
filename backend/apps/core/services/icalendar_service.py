from icalendar import Calendar, Event, vText
import pytz
from datetime import datetime, timedelta

def generar_ics_tarea(tarea):
    cal = Calendar()
    cal.add('prodid', '-//Gestor de Proyectos//ES')
    cal.add('version', '2.0')

    event = Event()
    event.add('summary', f'Tarea: {tarea.titulo}')
    if tarea.fecha_inicio:
        event.add('dtstart', tarea.fecha_inicio)
        event.add('dtend', tarea.fecha_limite + timedelta(days=1))
    else:
        event.add('dtstart', tarea.fecha_limite)
    # Fecha limite/inicio es solo Date, icalendar lo toma como evento de todo el día
    event.add('description', tarea.descripcion)
    
    cal.add_component(event)
    return cal.to_ical()

def generar_ics_reunion(reunion):
    cal = Calendar()
    cal.add('prodid', '-//Gestor de Proyectos//ES')
    cal.add('version', '2.0')

    event = Event()
    event.add('summary', f'Reunión: {reunion.titulo}')
    event.add('dtstart', reunion.fecha_hora_inicio)
    fin = reunion.fecha_hora_fin or (reunion.fecha_hora_inicio + timedelta(hours=1))
    event.add('dtend', fin)
    event.add('description', reunion.descripcion or '')
    if reunion.ubicacion:
        event.add('location', vText(reunion.ubicacion))
    
    cal.add_component(event)
    return cal.to_ical()
