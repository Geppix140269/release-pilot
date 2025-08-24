@echo off
echo ========================================
echo    Pushing ReleasePilot to GitHub
echo ========================================
echo.

cd /d C:\Development\release-pilot-clean

echo Checking git status...
git status

echo.
echo Adding all files...
git add .

echo.
echo Creating commit...
git commit -m "feat: Complete CI/CD automation platform - Production Ready v1.0.0"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo    PUSH COMPLETE! 
echo    Your code is now on GitHub!
echo ========================================
pause