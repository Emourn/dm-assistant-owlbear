# Cloudflare Tunnel — Expose your DM Assistant to players over the internet
#
# This script downloads cloudflared (if needed) and creates a temporary tunnel
# pointing to your local Vite dev server on port 5173.
#
# Players open the generated URL in their browser — no app install, no accounts.
#
# Usage:
#   .\scripts\start-tunnel.ps1
#
# Press Ctrl+C to stop the tunnel.

$ErrorActionPreference = "Stop"

$cloudflaredDir = "$PSScriptRoot\..\tools"
$cloudflaredExe = "$cloudflaredDir\cloudflared.exe"

# ── Download cloudflared if not present ─────────────────────────

if (-not (Test-Path $cloudflaredExe)) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Downloading cloudflared..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    if (-not (Test-Path $cloudflaredDir)) {
        New-Item -ItemType Directory -Path $cloudflaredDir -Force | Out-Null
    }

    $downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $cloudflaredExe -UseBasicParsing
        Write-Host "  Downloaded successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "  Failed to download cloudflared." -ForegroundColor Red
        Write-Host "  You can download it manually from:" -ForegroundColor Yellow
        Write-Host "  $downloadUrl" -ForegroundColor Yellow
        Write-Host "  Place it at: $cloudflaredExe" -ForegroundColor Yellow
        exit 1
    }
}

# ── Verify the server is running ────────────────────────────────

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DM Assistant — Cloudflare Tunnel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
    Write-Host "  Vite dev server detected on port 5173" -ForegroundColor Green
}
catch {
    Write-Host "  WARNING: Could not reach http://localhost:5173" -ForegroundColor Yellow
    Write-Host "  Make sure 'npm run multiplayer' is running first!" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "  Continue anyway? (y/n)"
    if ($continue -ne "y") { exit 0 }
}

# ── Start the tunnel ────────────────────────────────────────────

Write-Host ""
Write-Host "  Starting tunnel to http://localhost:5173..." -ForegroundColor Cyan
Write-Host ""
Write-Host "  -----------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Look for a line like:" -ForegroundColor DarkGray
Write-Host "    https://xxxxx-xxxxx.trycloudflare.com" -ForegroundColor Yellow
Write-Host "  Share THAT URL with your players!" -ForegroundColor DarkGray
Write-Host "  -----------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Press Ctrl+C to stop the tunnel." -ForegroundColor DarkGray
Write-Host ""

& $cloudflaredExe tunnel --url http://localhost:5173
