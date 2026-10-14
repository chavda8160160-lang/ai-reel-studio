@echo off
echo Starting SQL Server Service...
net start MSSQLSERVER
net start SQLBrowser
echo Done! You can now connect in SSMS.
pause
