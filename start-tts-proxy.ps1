# Startup script for TTS Proxy
# Edit this file with your FPT API key, then run it in PowerShell

# ===== CONFIG =====
$env:TTS_PROVIDER = 'fpt'
$env:PORT = '8787'
$env:FPT_TTS_API_KEY = 'YOUR_FPT_API_KEY_HERE'  # <-- THAY ĐỔI ĐÂY
$env:FPT_TTS_VOICE = 'banmai'
$env:FPT_TTS_SPEED = '1.0'

# ===== START =====
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "TTS Proxy - Starting..." -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Provider: $($env:TTS_PROVIDER)" -ForegroundColor Yellow
Write-Host "Port: $($env:PORT)" -ForegroundColor Yellow
Write-Host "API Key: $($env:FPT_TTS_API_KEY -replace '.{4}$','****')" -ForegroundColor Yellow
Write-Host ""
Write-Host "URL: http://localhost:$($env:PORT)/tts" -ForegroundColor Cyan
Write-Host ""

node "$PSScriptRoot\tts-proxy.mjs"
