from django.core.exceptions import ValidationError

TRANSICIONES_VALIDAS = {
    'OPORTUNIDAD': ['TRABAJANDO', 'PAUSADO', 'CAIDO'],
    'TRABAJANDO': ['PAUSADO', 'SEGUIMIENTO', 'CONCRETADO', 'CAIDO'],
    'PAUSADO': ['TRABAJANDO', 'SEGUIMIENTO', 'CAIDO'],
    'SEGUIMIENTO': ['TRABAJANDO', 'PAUSADO', 'CONCRETADO', 'CAIDO'],
    'CONCRETADO': ['SEGUIMIENTO'],
    'CAIDO': []
}

def validar_transicion(estado_actual, nuevo_estado):
    if not estado_actual:
        if nuevo_estado == 'OPORTUNIDAD':
            return True
        raise ValidationError("El proyecto debe iniciar en estado OPORTUNIDAD")
    if nuevo_estado not in TRANSICIONES_VALIDAS.get(estado_actual, []):
        raise ValidationError(f"Transición inválida de {estado_actual} a {nuevo_estado}")
    return True
