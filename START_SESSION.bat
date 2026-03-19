@echo off
title Servidor VTT DM Assistant
echo ===================================================
echo Iniciando el servidor de DM Assistant...
echo ===================================================
echo.

echo Cerrando sesiones anteriores si se habian quedado abiertas...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :3001') DO (
    IF NOT "%%T"=="0" taskkill /F /PID %%T >nul 2>&1
)
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :5173') DO (
    IF NOT "%%T"=="0" taskkill /F /PID %%T >nul 2>&1
)

echo.
echo Arrancando...
echo.
npm run multiplayer
pause
