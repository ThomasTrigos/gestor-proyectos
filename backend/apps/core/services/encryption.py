import base64
import hashlib
from django.conf import settings
from cryptography.fernet import Fernet


def _obtener_clave_fernet() -> bytes:
    """
    Obtiene una clave válida de 32 bytes en formato base64 para Fernet.
    Utiliza EMAIL_ENCRYPTION_KEY si existe, o deriva una clave determinista
    a partir del SECRET_KEY de Django usando SHA-256.
    """
    clave_personalizada = getattr(settings, 'EMAIL_ENCRYPTION_KEY', None)
    if clave_personalizada:
        if isinstance(clave_personalizada, str):
            clave_personalizada = clave_personalizada.encode('utf-8')
        try:
            # Si ya es un token base64 válido para Fernet
            Fernet(clave_personalizada)
            return clave_personalizada
        except Exception:
            pass

    # Derivar clave determinista a partir de SECRET_KEY
    secreto = getattr(settings, 'SECRET_KEY', 'default-gestor-proyectos-secret-key').encode('utf-8')
    hash_sha256 = hashlib.sha256(secreto).digest()
    return base64.urlsafe_b64encode(hash_sha256)


def cifrar_texto(texto: str) -> str:
    """
    Cifra un texto plano utilizando Fernet (AES-128-CBC + HMAC-SHA256).
    Devuelve la cadena cifrada en formato ASCII.
    """
    if not texto:
        return ""
    clave = _obtener_clave_fernet()
    f = Fernet(clave)
    cifrado_bytes = f.encrypt(texto.encode('utf-8'))
    return cifrado_bytes.decode('ascii')


def descifrar_texto(texto_cifrado: str) -> str:
    """
    Descifra un texto cifrado con Fernet devolviendo el texto plano original.
    Si ocurre un error o el texto está vacío, devuelve cadena vacía.
    """
    if not texto_cifrado:
        return ""
    try:
        clave = _obtener_clave_fernet()
        f = Fernet(clave)
        descifrado_bytes = f.decrypt(texto_cifrado.encode('ascii'))
        return descifrado_bytes.decode('utf-8')
    except Exception as e:
        return ""
