@echo off
chcp 65001 >nul
title MANAGESTOCK
cd /d "%~dp0"
npm start
if errorlevel 1 pause
