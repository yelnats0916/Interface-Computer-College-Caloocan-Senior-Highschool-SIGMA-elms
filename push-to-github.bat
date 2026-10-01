@echo off
title Sync SIGMA ELMS to GitHub
cd /d "c:\Users\stanl\Downloads\sigma-elms"
echo =======================================================
echo Saving and uploading latest changes to GitHub...
echo =======================================================
echo.
git add .
git commit -m "Update SIGMA ELMS - %date% %time%"
git push origin main
echo.
echo =======================================================
echo All synced! Your latest changes are now on GitHub.
echo =======================================================
pause
