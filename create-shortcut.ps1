$WshShell = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')

$lnkPath = Join-Path $desktop "ForgeAI Reel Studio.lnk"
$shortcut = $WshShell.CreateShortcut($lnkPath)
$shortcut.TargetPath = "C:\Users\Admin\.gemini\antigravity-ide\scratch\ai-fullstack-builder\launch-studio.bat"
$shortcut.WorkingDirectory = "C:\Users\Admin\.gemini\antigravity-ide\scratch\ai-fullstack-builder"
$shortcut.WindowStyle = 7
$shortcut.Description = "ForgeAI 30s Reel Studio & Instagram Auto-Pilot"
$shortcut.IconLocation = "C:\Windows\System32\shell32.dll,130"
$shortcut.Save()

Write-Output "SUCCESS: $lnkPath"
