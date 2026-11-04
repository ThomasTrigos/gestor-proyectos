#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "==> Instalando dependencias de Python..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Recolectando archivos estáticos..."
python manage.py collectstatic --no-input

echo "==> Aplicando migraciones de base de datos..."
python manage.py migrate

echo "==> Asegurando tabla de cache persistente..."
python manage.py createcachetable django_cache_table || true

if [ "$RUN_SEED_DATA" = "true" ] || [ "$RUN_SEED_DATA" = "1" ]; then
    echo "==> Poblando datos iniciales de prueba (seed_data)..."
    python manage.py seed_data
fi

echo "==> Build finalizado exitosamente."
