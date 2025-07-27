@echo off
echo Loading PowerShell Command Helper...
powershell -ExecutionPolicy Bypass -Command ". '.\powershell-command-helper.ps1'; Write-Host ''; Write-Host 'Type: run \"command1 && command2\"' -ForegroundColor Green; Write-Host 'Or use fix-policy if needed' -ForegroundColor Yellow"
echo.
echo PowerShell helper loaded! You can now use && commands.
pause
