# Credenciales de Acceso al Sistema

Documento de referencia para el acceso de los distintos roles y cuentas a la plataforma.

---

## 1. Cuentas de Acceso

| Rol en el Sistema | Nombre y Cargo | Usuario | Correo Electrónico | Contraseña |
| :--- | :--- | :--- | :--- | :--- |
| **Administrador (Superuser)** | Admin General (*SysAdmin*) | `admin` | `admin@gestor.com` | `admin1234` |
| **Recursos Humanos (RRHH)** | Valeria Martínez (*Líder RRHH y Operaciones*) | `rrhh` | `rrhh@empresa.com` | `rrhh1234` |
| **Gerente de Operaciones** | Esteban Gómez (*Director de Operaciones*) | `gerente` | `gerente@empresa.com` | `gerente1234` |
| **Líder Técnico Dev** | Pedro Sánchez (*Fullstack Lead*) | `pedro.dev` | `pedro.dev@empresa.com` | `pedro1234` |
| **Especialista Frontend** | Lucía Fernández (*Frontend React*) | `lucia.dev` | `lucia.dev@empresa.com` | `lucia1234` |
| **DevOps & Backend** | Tomás Navarro (*Cloud & DevOps*) | `tomas.dev` | `tomas.dev@empresa.com` | `tomas1234` |

> **Nota:** En la pantalla de inicio de sesión (`/login`), puede identificarse tanto con el **nombre de usuario** (ej. `rrhh`) como con el **correo electrónico** (ej. `rrhh@empresa.com`).

---

## 2. Permisos y Módulos por Rol

* **Administrador (`admin`):** Acceso total al panel `/admin/` de Django y configuración global.
* **Recursos Humanos (`rrhh`):** Gestión de Personal, Proyectos, Empresas, Finanzas, Calendario de Reuniones y Auditoría.
* **Gerente de Operaciones (`gerente`):** Tablero Ejecutivo (Dashboard con gráficos), PHS (Predicción de Salud de Proyectos), Finanzas (cuotas y cobros), Proyectos y Calendario.
* **Desarrolladores (`pedro.dev`, `lucia.dev`, `tomas.dev`):** Tablero Kanban de Tareas, Calendario personal (inicios, entregas, recordatorios) y detalle de Proyectos asignados.

---

## 3. Regeneración de Datos

Para restablecer la base de datos a este estado inicial consistente con los nuevos esquemas:
```bash
cd backend
python manage.py seed_data
```
