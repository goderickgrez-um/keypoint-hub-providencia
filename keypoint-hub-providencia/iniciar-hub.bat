@echo off
title Keypoint Hub Providencia - servidor
cd /d "%~dp0"
echo Iniciando el servidor del Hub...
echo No cierres esta ventana mientras el Hub use el sistema.
echo.
call npm.cmd start
echo.
echo El servidor se detuvo. Revisa el mensaje de arriba.
pause
