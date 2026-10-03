@echo off
cd /d "%~dp0"
py -3 play.py
if errorlevel 1 python play.py
pause
