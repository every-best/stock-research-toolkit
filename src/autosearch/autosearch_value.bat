@echo off
REM AutoSearch 长线价值投资每日任务
REM 港股（科技/军工/医疗/蓝筹）+ 美股价值股
REM 运行时间：每个工作日 09:00
REM 
REM Windows 任务计划程序：
REM schtasks /create /tn "AutoSearch Value AM" /tr "C:\Users\A\stock-research-toolkit\src\autosearch\autosearch_value.bat" /sc daily /st 09:00

cd /d C:\Users\A\stock-research-toolkit\src\autosearch
node autosearch_value.js >> ..\..\..\logs\autosearch_value_%date:~0,4%%date:~5,2%%date:~8,2%.log 2>&1
