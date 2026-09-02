@echo off
cd /d "%~dp0"
if not exist .dev.vars (
  echo.
  echo ERROR: falta .dev.vars
  echo Copia .dev.vars.example como .dev.vars y pega tu GEMINI_API_KEY.
  echo.
  pause
  exit /b 1
)
call npm run cf:dev
pause
