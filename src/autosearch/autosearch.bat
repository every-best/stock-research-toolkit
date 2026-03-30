@echo off
REM AutoSearch 每日定时任务启动脚本
REM Windows 任务计划程序配置：
REM   schtasks /create /tn "AutoSearch Daily" /tr "C:\Users\A\stock-research-toolkit\src\autosearch\autosearch.bat" /sc daily /st 21:00

cd /d C:\Users\A\stock-research-toolkit\src\autosearch
node autosearch.js run --value --push >> ..\..\..\logs\autosearch_%date:~0,4%%date:~5,2%%date:~8,2%.log 2>&1
