@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ========================================
echo   Firebase Firestore Rules
echo   project: mishnat-yosef
echo ========================================
echo.
echo Step 1: login (browser opens once)
npx --yes firebase-tools login
if errorlevel 1 pause & exit /b 1
echo.
echo Step 2: deploy firestore.rules
npx --yes firebase-tools deploy --only firestore:rules --project mishnat-yosef
if errorlevel 1 pause & exit /b 1
echo.
echo Done. Rules live on Firebase.
pause