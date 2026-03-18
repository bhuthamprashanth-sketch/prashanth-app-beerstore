@echo off
echo.
echo  =====================================================
echo   BeerStore - Starting Backend + Frontend
echo  =====================================================
echo.
echo  Backend  ^> http://localhost:5000
echo  Frontend ^> http://localhost:5173
echo.
cd /d "%~dp0"
npm run dev
pause
