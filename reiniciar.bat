@echo off
title Reiniciar yInvDeli
echo ==========================================
echo   Reiniciando Aplicacion yInvDeli
echo ==========================================

echo.
echo [1/3] Cerrando procesos anteriores...
:: Intentar cerrar procesos en los puertos 5173 y 3001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /f /pid %%a 2>nul

echo.
echo [2/3] Iniciando Servidor de Base de Datos (Puerto 3001)...
start "yInvDeli-Backend" /min npm.cmd run server

echo.
echo [3/3] Iniciando Interfaz Web (Vite - Puerto 5173)...
start "yInvDeli-Frontend" /min npm.cmd run dev

echo.
echo ==========================================
echo   ¡Listo! La aplicacion se esta iniciando.
echo   - Backend: http://localhost:3001
echo   - Frontend: http://localhost:5173
echo ==========================================
echo.
timeout /t 5
exit
