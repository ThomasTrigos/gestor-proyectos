@echo off
TITLE Gestor de Proyectos - Servidor Publico Netbook
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar-servidor-publico.ps1"
pause
