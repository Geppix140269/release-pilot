@echo off
echo ========================================
echo    Deploying ReleasePilot.net
echo ========================================
echo.

echo Creating production build directory...
mkdir deploy-site 2>nul
copy index.html deploy-site\
copy *.png deploy-site\ 2>nul
copy *.ico deploy-site\ 2>nul
copy site.webmanifest deploy-site\ 2>nul
copy og-image.png deploy-site\ 2>nul

echo.
echo Deploying to Netlify...
cd deploy-site
npx netlify deploy --prod --dir=. --site=release-pilot

echo.
echo ========================================
echo    DEPLOYMENT COMPLETE!
echo    Site: https://releasepilot.net
echo ========================================
pause