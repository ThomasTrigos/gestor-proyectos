<#
.SYNOPSIS
    Detiene los servidores del Gestor de Proyectos en ejecución local.
#>

Write-Host "Buscando procesos en los puertos 8000 (Django) y 5173 (Vite)..." -ForegroundColor Yellow

$ports = @(8000, 5173)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            try {
                $proc = Get-Process -Id $procId -ErrorAction Stop
                Write-Host "Terminando proceso $($proc.ProcessName) (PID: $procId) en puerto $port..." -ForegroundColor Cyan
                Stop-Process -Id $procId -Force
            } catch {
                Write-Host "No se pudo terminar el proceso $procId : $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "No hay procesos activos en el puerto $port." -ForegroundColor Green
    }
}

# Detener cloudflared si está activo
$cfProcs = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($cfProcs) {
    Write-Host "Terminando procesos de Cloudflare Tunnel..." -ForegroundColor Cyan
    $cfProcs | Stop-Process -Force
}

Write-Host "Servidores detenidos correctamente." -ForegroundColor Green
