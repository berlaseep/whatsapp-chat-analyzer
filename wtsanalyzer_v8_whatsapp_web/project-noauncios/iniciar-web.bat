@echo off
REM ============================================
REM  Script para instalar dependencias y arrancar
REM  la web en local (dev + server)
REM ============================================

cd /d "%~dp0"

echo.
echo === Instalando dependencias (npm install) ===
call npm install

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install ha fallado. Revisa el mensaje de arriba.
    pause
    exit /b %errorlevel%
)

echo.
echo === Dependencias instaladas correctamente ===
echo === Arrancando npm run dev y npm run server ===
echo.

REM Abrimos cada comando en su propia ventana para que ambos
REM se queden corriendo en paralelo (dev suele bloquear la consola)
start "npm run dev" cmd /k "npm run dev"
start "npm run server" cmd /k "npm run server"

echo.
echo Se han abierto dos ventanas: una para "npm run dev" y otra para "npm run server".
echo Puedes cerrar esta ventana si quieres, los procesos seguiran corriendo en las otras dos.
pause
