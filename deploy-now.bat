@echo off
echo Creating deployment folder...
if not exist site-deploy mkdir site-deploy

echo Copying files...
copy index.html site-deploy\
copy *.png site-deploy\
copy *.ico site-deploy\
copy site.webmanifest site-deploy\

echo.
echo ========================================
echo    FILES READY FOR DEPLOYMENT
echo ========================================
echo.
echo Now do ONE of these:
echo.
echo OPTION 1: In terminal, press Enter to link existing project
echo          Then select "release-pilot"
echo.
echo OPTION 2: Open site-deploy folder and drag all files
echo          to Netlify dashboard at:
echo          https://app.netlify.com/sites/release-pilot
echo.
pause