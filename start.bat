@echo off
chcp 65001 >nul
title BULLSLONG
cd /d "%~dp0"
npm start
if errorlevel 1 pause
