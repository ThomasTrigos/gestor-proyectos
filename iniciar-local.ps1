<#
.SYNOPSIS
    Inicia el Gestor de Proyectos (Backend Django + Frontend React Vite) en entorno local.
.DESCRIPTION
    Verifica dependencias, aplica migraciones, inicia los servidores en ventanas separadas
    y abre la aplicación en el navegador web predeterminado.
#>

$ErrorActionPreference = "Stop"

$RootPath = $PSScriptRoot
if (-not $RootPath) { $RootPath = Get-Location }

$BackendPath = Join-Path $RootPath "backend"
$FrontendPath = Join-Path $RootPath "frontend"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     INICIANDO GESTOR DE PROYECTOS (MODO LOCAL)           " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verificar Python y Entorno Virtual
Write-Host "`n[1/4] Verificando entorno de Python y Backend..." -ForegroundColor Yellow
$VenvPython = Join-Path $BackendPath ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Host "No se encontro el entorno virtual. Creando en $BackendPath\.venv ..." -ForegroundColor Yellow
    Set-Location $BackendPath
    python -m venv .venv
    $VenvPython = Join-Path $BackendPath ".venv\Scripts\python.exe"
    Write-Host "Instalando dependencias de backend desde requirements.txt..." -ForegroundColor Yellow
    & $VenvPython -m pip install --upgrade pip
    & $VenvPython -m pip install -r requirements.txt
}

# 2. Migraciones y Base de Datos
Write-Host "`n[2/4] Verificando base de datos y aplicando migraciones..." -ForegroundColor Yellow
Set-Location $BackendPath
& $VenvPython manage.py migrate --noinput

# 3. Verificar Frontend
Write-Host "`n[3/4] Verificando dependencias de Frontend (Node.js)..." -ForegroundColor Yellow
$NodeModules = Join-Path $FrontendPath "node_modules"
if (-not (Test-Path $NodeModules)) {
    Write-Host "Instalando dependencias de frontend con npm install..." -ForegroundColor Yellow
    Set-Location $FrontendPath
    npm install
}

# 4. Lanzar Servidores en paralelo
Write-Host "`n[4/4] Levantando servidores..." -ForegroundColor Yellow

# Backend en una nueva ventana de PowerShell
Write-Host "-> Iniciando Backend Django en http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "Write-Host '=== BACKEND DJANGO (Puerto 8000) ===' -ForegroundColor Cyan; Set-Location '$BackendPath'; & '.venv\Scripts\python.exe' manage.py runserver 127.0.0.1:8000"

# Esperar 2 segundos para dar tiempo al backend
Start-Sleep -Seconds 2

# Frontend en una nueva ventana de PowerShell
Write-Host "-> Iniciando Frontend Vite en http://localhost:5173 ..." -ForegroundColor Cyan
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "Write-Host '=== FRONTEND REACT VITE (Puerto 5173) ===' -ForegroundColor Green; Set-Location '$FrontendPath'; npm run dev"

# Esperar 3 segundos para dar tiempo al frontend
Start-Sleep -Seconds 3

# Abrir el navegador
Write-Host "`nAbriendo navegador web en http://localhost:5173 ..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "   SISTEMA INICIADO EXITOSAMENTE                          " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Frontend:     http://localhost:5173" -ForegroundColor White
Write-Host "Backend API:  http://127.0.0.1:8000/api/" -ForegroundColor White
Write-Host "Django Admin: http://127.0.0.1:8000/admin/" -ForegroundColor White
Write-Host "`nCredenciales disponibles para prueba:" -ForegroundColor Yellow
Write-Host "  - Recursos Humanos:  usuario: rrhh     | pass: rrhh1234" -ForegroundColor White
Write-Host "  - Gerente:           usuario: gerente  | pass: gerente1234" -ForegroundColor White
Write-Host "  - Administrador:     usuario: admin    | pass: admin1234" -ForegroundColor White
Write-Host "`nPara detener la aplicacion, cierra las dos ventanas de terminal abiertas." -ForegroundColor Gray
