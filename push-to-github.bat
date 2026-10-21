@echo off
setlocal
title Sync SIGMA ELMS to GitHub
cd /d "%~dp0"
if errorlevel 1 goto folder_error

where git >nul 2>&1
if errorlevel 1 goto git_missing

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 goto repository_error

set "SIGMA_BRANCH="
for /f "delims=" %%B in ('git branch --show-current') do set "SIGMA_BRANCH=%%B"
if not "%SIGMA_BRANCH%"=="main" goto branch_error

echo Saving and uploading changes to GitHub...
echo.
git add --all
if errorlevel 1 goto failed

git diff --cached --quiet
if errorlevel 2 goto failed
if errorlevel 1 goto commit_changes
echo No new code changes to commit.
goto push_changes

:commit_changes
git commit -m "Update SIGMA ELMS - %date% %time%"
if errorlevel 1 goto failed

:push_changes
git push origin main
if errorlevel 1 goto failed
echo.
echo GitHub push succeeded.
echo If new commits were pushed, Alwaysdata deployment starts automatically.
echo Check GitHub Actions for the deployment result before refreshing your site.
pause
exit /b 0

:folder_error
echo ERROR: Cannot open the project folder.
goto stop_error
:git_missing
echo ERROR: Git is not installed or is unavailable in PATH.
goto stop_error
:repository_error
echo ERROR: This folder is not a Git repository.
goto stop_error
:branch_error
echo ERROR: This shortcut requires the main branch. Current branch: %SIGMA_BRANCH%
goto stop_error
:failed
echo.
echo ERROR: Git did not finish successfully. Read the error above.
echo Changes may still be saved locally. Take a screenshot if you need help.
:stop_error
pause
exit /b 1
