@echo off
setlocal

title WhatsApp Chat Analyzer - Subir version

echo ==========================================
echo   WHATSAPP CHAT ANALYZER - GITHUB
echo ==========================================
echo.

REM 1. Comprobar que estamos dentro de un repositorio Git
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Esta carpeta no es un repositorio Git.
    echo.
    pause
    exit /b 1
)

REM 2. Comprobar si hay un rebase en curso
git rebase --show-current-patch >nul 2>&1
if not errorlevel 1 (
    echo [ERROR] Hay un rebase en curso.
    echo.
    echo Ejecuta primero:
    echo     git status
    echo.
    echo No se ha modificado ni subido nada.
    pause
    exit /b 1
)

REM 3. Mostrar cambios
echo [1/6] Comprobando cambios...
echo.
git status
echo.

REM 4. Pedir nombre de la version
set /p VERSION="Escribe el nombre de la version (ej: Version 7): "

if "%VERSION%"=="" (
    echo [ERROR] Debes escribir un nombre para la version.
    pause
    exit /b 1
)

echo.
echo [2/6] Anadiendo archivos...
git add .

if errorlevel 1 (
    echo [ERROR] No se pudieron anadir los archivos.
    pause
    exit /b 1
)

REM 5. Comprobar si realmente hay cambios
git diff --cached --quiet

if not errorlevel 1 (
    echo.
    echo [AVISO] No hay cambios nuevos para subir.
    echo.
    pause
    exit /b 0
)

REM 6. Commit
echo.
echo [3/6] Creando commit...
git commit -m "%VERSION%"

if errorlevel 1 (
    echo.
    echo [ERROR] No se pudo crear el commit.
    pause
    exit /b 1
)

REM 7. Actualizar desde GitHub
echo.
echo [4/6] Actualizando desde GitHub...
git pull origin main --rebase

if errorlevel 1 (
    echo.
    echo ==========================================
    echo [ERROR] No se pudo actualizar desde GitHub.
    echo ==========================================
    echo.
    echo NO se ha hecho push.
    echo.
    echo Ejecuta:
    echo     git status
    echo.
    echo y revisa el problema antes de continuar.
    pause
    exit /b 1
)

REM 8. Push
echo.
echo [5/6] Subiendo a GitHub...
git push origin main

if errorlevel 1 (
    echo.
    echo ==========================================
    echo [ERROR] No se pudo hacer push.
    echo ==========================================
    echo.
    echo Ejecuta:
    echo     git status
    echo.
    pause
    exit /b 1
)

REM 9. Final
echo.
echo [6/6] LISTO
echo ==========================================
echo   VERSION SUBIDA CORRECTAMENTE
echo ==========================================
echo.
echo Commit:
git log -1 --oneline
echo.
echo GitHub ya tiene los nuevos cambios.
echo.
pause