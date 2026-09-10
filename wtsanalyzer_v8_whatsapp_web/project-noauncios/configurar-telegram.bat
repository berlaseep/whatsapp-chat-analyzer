@echo off
setlocal

echo ==============================================
echo   CONFIGURAR WEBHOOK - WHATSAPP ANALYZER
echo ==============================================
echo.
set /p TOKEN="Token del bot de Telegram: "
set /p DOMAIN="Dominio del Worker (ej: https://tu-app.workers.dev): "
set /p SECRET="TELEGRAM_WEBHOOK_SECRET: "

echo.
echo Configurando webhook...
curl.exe -s -X POST "https://api.telegram.org/bot%TOKEN%/setWebhook" ^
  -H "Content-Type: application/json" ^
  -d "{\"url\":\"%DOMAIN%/api/telegram/webhook\",\"secret_token\":\"%SECRET%\",\"allowed_updates\":[\"message\",\"callback_query\"]}"
echo.
echo.
pause
