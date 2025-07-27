# Simple && Command Support for PowerShell + Linux Commands
# Just run commands with && like in bash + common Linux commands

# Check and fix execution policy if needed
function Test-ExecutionPolicy {
    try {
        $currentPolicy = Get-ExecutionPolicy -Scope CurrentUser
        if ($currentPolicy -eq "Restricted") {
            Write-Host "Execution policy is Restricted. Attempting to fix..." -ForegroundColor Yellow
            try {
                Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
                Write-Host "✅ Execution policy fixed: RemoteSigned" -ForegroundColor Green
            }
            catch {
                Write-Host "❌ Could not change execution policy. Run as Administrator:" -ForegroundColor Red
                Write-Host "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force" -ForegroundColor White
                return $false
            }
        }
        elseif ($currentPolicy -eq "Undefined") {
            Write-Host "Execution policy undefined. Setting to RemoteSigned..." -ForegroundColor Yellow
            try {
                Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
                Write-Host "✅ Execution policy set: RemoteSigned" -ForegroundColor Green
            }
            catch {
                Write-Host "❌ Could not set execution policy. Run as Administrator." -ForegroundColor Red
                return $false
            }
        }
        else {
            Write-Host "✅ Execution policy OK: $currentPolicy" -ForegroundColor Green
        }
        return $true
    }
    catch {
        Write-Host "❌ Could not check execution policy: $_" -ForegroundColor Red
        return $false
    }
}

# Test execution policy on script load
$policyOK = Test-ExecutionPolicy

# Map Linux commands to PowerShell equivalents
function Convert-LinuxCommand {
    param([string]$cmd)
    
    $cmd = $cmd.Trim()
      # Common Linux to PowerShell mappings
    $mappings = @{
        '^ls$' = 'Get-ChildItem'
        '^ls (.+)$' = 'Get-ChildItem $1'
        '^pwd$' = 'Get-Location'
        '^cat (.+)$' = 'Get-Content $1'
        '^head (.+)$' = 'Get-Content $1 | Select-Object -First 10'
        '^head -n (\d+) (.+)$' = 'Get-Content $2 | Select-Object -First $1'
        '^tail (.+)$' = 'Get-Content $1 | Select-Object -Last 10'
        '^tail -n (\d+) (.+)$' = 'Get-Content $2 | Select-Object -Last $1'
        '^mkdir (.+)$' = 'New-Item -ItemType Directory -Path $1'
        '^rm (.+)$' = 'Remove-Item $1'
        '^rm -rf (.+)$' = 'Remove-Item -Recurse -Force $1'
        '^cp (.+) (.+)$' = 'Copy-Item $1 $2'
        '^mv (.+) (.+)$' = 'Move-Item $1 $2'
        '^touch (.+)$' = 'New-Item -ItemType File -Path $1'
        '^grep (.+) (.+)$' = 'Select-String $1 $2'
        '^find (.+) -name (.+)$' = 'Get-ChildItem -Path $1 -Filter $2 -Recurse'
        '^which (.+)$' = 'Get-Command $1'
        '^clear$' = 'Clear-Host'
        '^history$' = 'Get-History'
        '^ps$' = 'Get-Process'
        '^kill (.+)$' = 'Stop-Process -Id $1'
        '^df$' = 'Get-WmiObject -Class Win32_LogicalDisk'
        '^whoami$' = 'whoami'
        '^date$' = 'Get-Date'
        '^wc -l (.+)$' = '(Get-Content $1).Count'
        '^du -h (.+)$' = 'Get-ChildItem -Path $1 -Recurse | Measure-Object -Property Length -Sum'
    }
    
    foreach ($pattern in $mappings.Keys) {
        if ($cmd -match $pattern) {
            $newCmd = $cmd -replace $pattern, $mappings[$pattern]
            Write-Host "Converting: $cmd → $newCmd" -ForegroundColor Cyan
            return $newCmd
        }
    }
    
    return $cmd
}

function Run-AndCommands {
    param([string]$Commands)
    
    $cmds = $Commands -split ' && '
      foreach ($cmd in $cmds) {
        $cmd = $cmd.Trim()
        
        # Convert Linux commands to PowerShell
        $cmd = Convert-LinuxCommand $cmd
        
        Write-Host "Running: $cmd" -ForegroundColor Green
        
        try {
            Invoke-Expression $cmd
            
            # Only check exit code for external programs, not PowerShell cmdlets
            if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null -and $cmd -notmatch '^(echo|write-host|get-|set-|new-)') {
                Write-Host "Command failed with exit code: $LASTEXITCODE. Stopping." -ForegroundColor Red
                return
            }
        }
        catch {
            Write-Host "Command failed: $_. Stopping." -ForegroundColor Red
            return
        }
        
        # Reset exit code for next command
        $global:LASTEXITCODE = 0
    }
    
    Write-Host "All commands completed successfully!" -ForegroundColor Green
}

# Simple alias
Set-Alias run Run-AndCommands

# Function to fix execution policy issues
function Fix-ExecutionPolicy {
    Write-Host "Attempting to fix PowerShell execution policy..." -ForegroundColor Yellow
    
    try {
        # Try CurrentUser scope first (doesn't require admin)
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
        Write-Host "✅ Execution policy set to RemoteSigned for CurrentUser" -ForegroundColor Green
        
        # Verify the change
        $newPolicy = Get-ExecutionPolicy -Scope CurrentUser
        Write-Host "Current policy: $newPolicy" -ForegroundColor Cyan
        return $true
    }
    catch {
        Write-Host "❌ Failed to set execution policy for CurrentUser: $_" -ForegroundColor Red
        
        Write-Host "" -ForegroundColor White
        Write-Host "Manual fix options:" -ForegroundColor Yellow
        Write-Host "1. Run PowerShell as Administrator and execute:" -ForegroundColor White
        Write-Host "   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force" -ForegroundColor Cyan
        Write-Host "" -ForegroundColor White
        Write-Host "2. Or use for current session only:" -ForegroundColor White
        Write-Host "   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process" -ForegroundColor Cyan
        
        return $false
    }
}

# Alias for easy access
Set-Alias fix-policy Fix-ExecutionPolicy

Write-Host "Simple && support loaded!" -ForegroundColor Green
Write-Host "Usage: run 'pnpm install && pnpm dev'" -ForegroundColor Yellow
Write-Host "Linux commands supported: ls, pwd, cat, head, tail, mkdir, rm, cp, mv, touch, grep, find, which, clear, ps, kill, df, whoami, date, wc, du" -ForegroundColor Cyan

# Show execution policy status
if ($policyOK) {
    Write-Host "🚀 Ready to use! Run commands with: run 'command1 && command2'" -ForegroundColor Green
} else {
    Write-Host "⚠️ Execution policy needs manual fixing. See instructions above." -ForegroundColor Yellow
}


# run this script: (. .\powershell-command-helper.ps1)
# Fix policy issues anytime
# run this  : (fix-policy)