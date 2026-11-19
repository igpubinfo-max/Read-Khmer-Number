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

# 2. Wait for Workflow Run
Write-Host "Checking GitHub Actions workflow status..." -ForegroundColor Yellow
$run = $null
for ($i = 0; $i -lt 30; $i++) {
    try {
        $runsRes = Invoke-RestMethod -Uri "https://api.github.com/repos/$OwnerRepo/actions/runs?per_page=5" -Headers $headers
        if ($runsRes.workflow_runs -and $runsRes.workflow_runs.Count -gt 0) {
            $run = $runsRes.workflow_runs[0]
            Write-Host "Found Run #$($run.run_number) [ID: $($run.id)] - Status: $($run.status)" -ForegroundColor Gray
            break
        }
    } catch {}
    Start-Sleep -Seconds 3
}

if (-not $run) {
    Write-Host "No active workflow run found. Please check: https://github.com/$OwnerRepo/actions" -ForegroundColor Red
    exit 1
}

# 3. Poll until completed
$startTime = Get-Date
while ($run.status -ne 'completed') {
    $elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds)
    Write-Host "  Building APK on cloud runner... ($elapsed s elapsed) Status: $($run.status)" -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    try {
        $run = Invoke-RestMethod -Uri "https://api.github.com/repos/$OwnerRepo/actions/runs/$($run.id)" -Headers $headers
    } catch {}
}

Write-Host "Workflow finished with conclusion: $($run.conclusion)" -ForegroundColor Green

if ($run.conclusion -ne 'success') {
    Write-Host "Build failed! Please check logs at: $($run.html_url)" -ForegroundColor Red
    exit 1
}

# 4. Fetch Artifacts
Write-Host "Fetching generated APK artifacts..." -ForegroundColor Yellow
$artifactsRes = Invoke-RestMethod -Uri "https://api.github.com/repos/$OwnerRepo/actions/runs/$($run.id)/artifacts" -Headers $headers
if (-not $artifactsRes.artifacts -or $artifactsRes.artifacts.Count -eq 0) {
    Write-Host "No artifacts found for run #$($run.run_number)" -ForegroundColor Red
    exit 1
}

$apkArtifact = $artifactsRes.artifacts | Where-Object { $_.name -like "*APK*" } | Select-Object -First 1
if (-not $apkArtifact) {
    $apkArtifact = $artifactsRes.artifacts[0]
}

Write-Host "Downloading artifact: $($apkArtifact.name) ($([math]::Round($apkArtifact.size_in_bytes / 1MB, 2)) MB)..." -ForegroundColor Cyan

$zipPath = Join-Path $OutDir "artifact_$($run.id).zip"
$curlExe = "$env:SystemRoot\System32\curl.exe"
if (Test-Path $curlExe) {
    & $curlExe -s -L -H "Authorization: Bearer $token" -H "User-Agent: Downloader" -o $zipPath $apkArtifact.archive_download_url
} else {
    Invoke-WebRequest -Uri $apkArtifact.archive_download_url -Headers $headers -OutFile $zipPath
}

# 5. Extract APK
$extractDir = Join-Path $OutDir "extracted_$($run.id)"
if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

$foundApks = Get-ChildItem -Path $extractDir -Filter "*.apk" -Recurse
if ($foundApks.Count -eq 0) {
    Write-Host "No APK found in extracted archive!" -ForegroundColor Red
    exit 1
}

$destApk = Join-Path $OutDir "KhmerAmountConverter.apk"
$rootApk = Join-Path $RepoRoot "KhmerAmountConverter.apk"
Copy-Item $foundApks[0].FullName -Destination $destApk -Force
Copy-Item $foundApks[0].FullName -Destination $rootApk -Force
Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  SUCCESS! APK FILE IS READY:" -ForegroundColor White
Write-Host "  -> $rootApk" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Green

if (-not $NoOpenExplorer) {
    explorer.exe /select,"$rootApk"
}
