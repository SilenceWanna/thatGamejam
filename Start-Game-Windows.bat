@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launcher\bootstrap-windows.ps1" %*
set "game_exit_code=%errorlevel%"
if not "%game_exit_code%"=="0" (
  echo.
  echo Game launch failed. Check the error above.
  pause
)
exit /b %game_exit_code%
