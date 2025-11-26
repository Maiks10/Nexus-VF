@echo off
echo ============================================
echo   UPLOADING index.js to VPS
echo ============================================
echo.
echo Source: d:\Projetos\CRM\Nexus\crm-backend\index.js
echo Destination: root@31.97.64.67:/var/www/crm-backend/index.js
echo.
echo Press any key to start the upload...
pause >nul

scp d:\Projetos\CRM\Nexus\crm-backend\index.js root@31.97.64.67:/var/www/crm-backend/index.js

echo.
echo ============================================
echo   UPLOAD COMPLETED
echo ============================================
echo.
echo Press any key to restart the backend...
pause >nul

ssh root@31.97.64.67 "pm2 restart crm-backend"

echo.
echo ============================================
echo   BACKEND RESTARTED
echo ============================================
echo.
echo Press any key to close...
pause
