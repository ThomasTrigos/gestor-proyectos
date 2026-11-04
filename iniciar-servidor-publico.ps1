<#
.SYNOPSIS
    Inicia el Gestor de Proyectos en modo Publico (Netbook / Servidor Remoto)
    mediante Cloudflare Tunnel seguro con HTTPS gratuito y sin abrir puertos.
.DESCRIPTION
    1. Verifica Python, entorno virtual y dependencias.
    2. Aplica migraciones pendientes en la base de datos.
    3. Verifica dependencias de Node / React Vite.
    4. Descarga automaticamente Cloudflared si no esta instalado.
    5. Inicia Backend Django en http://127.0.0.1:8000.
    6. Inicia Frontend Vite en http://127.0.0.1:5173.
    7. Levanta el tunel publico HTTPS y muestra el enlace generado.
#>

$ErrorActionPreference = "Stop"

$RootPath = $PSScriptRoot
if (-not $RootPath) { $RootPath = Get-Location }

$BackendPath = Join-Path $RootPath "backend"
$FrontendPath = Join-Path $RootPath "frontend"
$BinPath = Join-Path $RootPath ".bin"

if (-not (Test-Path $BinPath)) {
    New-Item -ItemType Directory -Path $BinPath -Force | Out-Null
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   GESTOR DE PROYECTOS - INICIADOR DE SERVIDOR PUBLICO    " -ForegroundColor Cyan
Write-Host "         (Optimizado para Netbook / Acceso Remoto)        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verificar Python y Entorno Virtual
Write-Host ""
Write-Host "[1/5] Verificando entorno de Python y Backend..." -ForegroundColor Yellow
$VenvPython = Join-Path $BackendPath ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Host "No se encontro el entorno virtual en $BackendPath\.venv. Creando..." -ForegroundColor Yellow
    Set-Location $BackendPath
    python -m venv .venv
    $VenvPython = Join-Path $BackendPath ".venv\Scripts\python.exe"
    Write-Host "Instalando dependencias de backend..." -ForegroundColor Yellow
    & $VenvPython -m pip install --upgrade pip
    & $VenvPython -m pip install -r requirements.txt
    & $VenvPython -m pip install cryptography
}

# 1.1 Asegurar archivo .env con SECRET_KEY segura
$EnvFile = Join-Path $BackendPath ".env"
if (-not (Test-Path $EnvFile)) {
    Write-Host "Generando archivo .env con clave criptografica aleatoria..." -ForegroundColor Yellow
    $GeneratedSecret = & $VenvPython -c "import secrets; print(secrets.token_urlsafe(50))"
    $EnvLines = @(
        "DEBUG=False",
        "SECRET_KEY=$GeneratedSecret",
        "DB_ENGINE=django.db.backends.sqlite3",
        "DB_NAME=db.sqlite3",
        "FRONTEND_URL=http://localhost:5173",
        "CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173",
        "DEFAULT_FROM_EMAIL=noreply@gestorproyectos.com"
    )
    $EnvContent = $EnvLines -join "`r`n"
    Set-Content -Path $EnvFile -Value $EnvContent
}

# 2. Migraciones y Base de Datos
Write-Host ""
Write-Host "[2/5] Aplicando migraciones de base de datos..." -ForegroundColor Yellow
Set-Location $BackendPath
& $VenvPython manage.py migrate --noinput

# 3. Verificar Frontend
Write-Host ""
Write-Host "[3/5] Verificando dependencias de Frontend..." -ForegroundColor Yellow
$NodeModules = Join-Path $FrontendPath "node_modules"
if (-not (Test-Path $NodeModules)) {
    Write-Host "Instalando dependencias de frontend con npm install..." -ForegroundColor Yellow
    Set-Location $FrontendPath
    npm install
}

# 4. Verificar o Descargar Cloudflared
Write-Host ""
Write-Host "[4/5] Verificando cliente de tunel seguro (Cloudflare Tunnel)..." -ForegroundColor Yellow
$CloudflaredExe = $null

$SystemCloudflared = Get-Command "cloudflared" -ErrorAction SilentlyContinue
if ($SystemCloudflared) {
    $CloudflaredExe = $SystemCloudflared.Source
    Write-Host "Cloudflared detectado en el sistema: $CloudflaredExe" -ForegroundColor Green
} else {
    $LocalCloudflared = Join-Path $BinPath "cloudflared.exe"
    if (Test-Path $LocalCloudflared) {
        $CloudflaredExe = $LocalCloudflared
        Write-Host "Cloudflared detectado en: $CloudflaredExe" -ForegroundColor Green
    } else {
        Write-Host "Cloudflared no esta presente. Descargando version oficial para Windows..." -ForegroundColor Cyan
        $DownloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $DownloadUrl -OutFile $LocalCloudflared -UseBasicParsing
            $CloudflaredExe = $LocalCloudflared
            Write-Host "Cloudflared descargado exitosamente en $LocalCloudflared" -ForegroundColor Green
        } catch {
            Write-Host "Error al descargar Cloudflared automaticamente: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "Por favor descarga cloudflared-windows-amd64.exe manualmente y guardalo como $LocalCloudflared" -ForegroundColor Yellow
            exit 1
        }
    }
}

# 5. Iniciar Servidores y Tunel
Write-Host ""
Write-Host "[5/5] Levantando servidores y tunel publico..." -ForegroundColor Yellow

# Iniciar Backend Django
Write-Host "-> Iniciando Backend Django en http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "Write-Host '=== BACKEND DJANGO (127.0.0.1:8000) ===' -ForegroundColor Cyan; Set-Location '$BackendPath'; & '.venv\Scripts\python.exe' manage.py runserver 127.0.0.1:8000"

Start-Sleep -Seconds 2

# Iniciar Frontend Vite
Write-Host "-> Iniciando Frontend Vite en http://127.0.0.1:5173 ..." -ForegroundColor Cyan
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "Write-Host '=== FRONTEND VITE (127.0.0.1:5173) ===' -ForegroundColor Green; Set-Location '$FrontendPath'; npm run dev"

Start-Sleep -Seconds 3

# Iniciar Tunel en consola dedicada y capturar log
$TunnelLog = Join-Path $BinPath "tunnel.log"
if (Test-Path $TunnelLog) { Remove-Item $TunnelLog -Force }

Write-Host "-> Conectando tunel Cloudflare hacia http://127.0.0.1:5173 ..." -ForegroundColor Cyan
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "Write-Host '=== TUNEL PUBLICO CLOUDFLARE ===' -ForegroundColor Magenta; & '$CloudflaredExe' tunnel --url http://127.0.0.1:5173 --logfile '$TunnelLog'"

Write-Host "Obteniendo URL publica segura con HTTPS..." -ForegroundColor Yellow

$PublicUrl = $null
$TimeoutSeconds = 25
$StartTime = Get-Date

while (-not $PublicUrl -and ((Get-Date) - $StartTime).TotalSeconds -lt $TimeoutSeconds) {
    Start-Sleep -Milliseconds 800
    if (Test-Path $TunnelLog) {
        $LogContent = Get-Content $TunnelLog -Raw -ErrorAction SilentlyContinue
        if ($LogContent -match '(https://[a-zA-Z0-9\-]+\.trycloudflare\.com)') {
            $PublicUrl = $matches[1]
        }
    }
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "           SISTEMA PUBLICO EN LINEA!                      " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

if ($PublicUrl) {
    Write-Host ""
    Write-Host "[+] ENLACE PUBLICO (HTTPS SEGURO):" -ForegroundColor Cyan
    Write-Host "   $PublicUrl" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host ""
    Write-Host "   (Comparte este enlace para que cualquier usuario acceda" -ForegroundColor Gray
    Write-Host "    a tu Netbook desde su celular o PC sin importar donde este)" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "El tunel se esta conectando en la ventana de Cloudflare." -ForegroundColor Yellow
    Write-Host "Por favor revisa la ventana morada para ver la direccion https://*.trycloudflare.com generada." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[*] ENLACE LOCAL (Para usar desde esta misma Netbook):" -ForegroundColor Cyan
Write-Host "   http://localhost:5173" -ForegroundColor White

Write-Host ""
Write-Host "[*] ACCESO AL SISTEMA:" -ForegroundColor Yellow
Write-Host "   Inicie sesion con su usuario asignado (Administrador, RRHH o Gerente)." -ForegroundColor White
Write-Host "   Por seguridad, cambie las contrasenas iniciales desde el panel de administracion." -ForegroundColor Gray

Write-Host ""
Write-Host "[*] CONSEJO PARA ENVIO DE EMAILS REALES:" -ForegroundColor Yellow
Write-Host "   1. Ingresa a la plataforma con usuario 'admin' o 'rrhh'." -ForegroundColor Gray
Write-Host "   2. Ve al menu lateral 'Config. Correo' (o http://localhost:5173/configuracion/email)." -ForegroundColor Gray
Write-Host "   3. Carga tu cuenta de Gmail y Contrasena de Aplicacion de 16 letras." -ForegroundColor Gray
Write-Host "   4. Haz clic en 'Probar Envio de Correo Real' para confirmar." -ForegroundColor Gray

Write-Host ""
Write-Host "Para apagar todos los servidores, ejecuta: .\detener-local.ps1 o cierra las ventanas." -ForegroundColor Gray

if ($PublicUrl) {
    Start-Process $PublicUrl
} else {
    Start-Process "http://localhost:5173"
}
