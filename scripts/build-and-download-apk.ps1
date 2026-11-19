param(
    [switch]$NoOpenExplorer
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $RepoRoot

$OwnerRepo = "igpubinfo-max/Read-Khmer-Number"
$OutDir = Join-Path $RepoRoot "Release_APK_AAB"
if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  BUILDING & DOWNLOADING KHMER AMOUNT CONVERTER APK" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Get Token from Git Credentials
$credInput = "protocol=https`nhost=github.com`n`n"
$credOutput = $credInput | git credential fill 2>$null
$token = (($credOutput | Where-Object { $_ -match '^password=' }) -replace '^password=', '').Trim()

$headers = @{
    "User-Agent" = "KhmerAmountConverter-Downloader/1.0"
    "Accept"     = "application/vnd.github+json"
}
if ($token) {
    $headers["Authorization"] = "Bearer $token"
}

# 2. Check or trigger build
Write-Host "Checking GitHub Releases for latest APK..." -ForegroundColor Yellow
$destApk = Join-Path $OutDir "KhmerAmountConverter.apk"
$rootApk = Join-Path $RepoRoot "KhmerAmountConverter.apk"

try {
    $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/$OwnerRepo/releases" -Headers $headers
    if ($releases -and $releases.Count -gt 0) {
        $latest = $releases[0]
        $apkAsset = $latest.assets | Where-Object { $_.name -like "*KhmerAmountConverter.apk*" -or $_.name -like "*debug.apk*" } | Select-Object -First 1
        if ($apkAsset) {
            Write-Host "Found Release: $($latest.name) [Tag: $($latest.tag_name)]" -ForegroundColor Green
            Write-Host "Downloading $($apkAsset.name) ($([math]::Round($apkAsset.size / 1MB, 2)) MB)..." -ForegroundColor Cyan
            
            $curlExe = "$env:SystemRoot\System32\curl.exe"
            if (Test-Path $curlExe) {
                & $curlExe -s -L -H "Authorization: Bearer $token" -H "User-Agent: Downloader" -o $rootApk $apkAsset.browser_download_url
            } else {
                Invoke-WebRequest -Uri $apkAsset.browser_download_url -Headers $headers -OutFile $rootApk
            }
            Copy-Item $rootApk -Destination $destApk -Force
            
            Write-Host ""
            Write-Host "======================================================================" -ForegroundColor Green
            Write-Host "  SUCCESS! APK FILE IS READY:" -ForegroundColor White
            Write-Host "  -> $rootApk" -ForegroundColor Yellow
            Write-Host "======================================================================" -ForegroundColor Green

            if (-not $NoOpenExplorer) {
                explorer.exe /select,"$rootApk"
            }
            exit 0
        }
    }
} catch {
    Write-Host "Error checking release: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "No release found yet. Please check: https://github.com/$OwnerRepo/actions" -ForegroundColor Red
exit 1
