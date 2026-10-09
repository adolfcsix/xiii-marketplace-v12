param(
  [switch]$SkipInstall,
  [switch]$SkipSeed,
  [switch]$SkipTypecheck,
  [switch]$AllowBusyPorts
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "[PASS] $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; exit 1 }
function New-Secret {
  $bytes = New-Object byte[] 48
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return ([Convert]::ToBase64String($bytes)).TrimEnd('=').Replace('+','A').Replace('/','B')
}
function Set-DotEnvValue([string]$path,[string]$key,[string]$value) {
  $content = Get-Content $path -Raw
  $pattern = '(?m)^' + [Regex]::Escape($key) + '=.*$'
  if ([Regex]::IsMatch($content, $pattern)) {
    $content = [Regex]::Replace($content, $pattern, { param($m) "$key=$value" })
  } else {
    $content = $content.TrimEnd() + "`r`n$key=$value`r`n"
  }
  [IO.File]::WriteAllText((Resolve-Path $path), $content, (New-Object Text.UTF8Encoding($false)))
}

Step 'Kiểm tra môi trường Windows'
$preflightArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $PSScriptRoot 'preflight.ps1'))
if ($AllowBusyPorts) { $preflightArgs += '-AllowBusyPorts' }
& powershell @preflightArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Step 'Chuẩn bị .env development'
if (-not (Test-Path '.env')) {
  Copy-Item '.env.example' '.env'
  Set-DotEnvValue '.env' 'JWT_ACCESS_SECRET' (New-Secret)
  Set-DotEnvValue '.env' 'JWT_REFRESH_SECRET' (New-Secret)
  Set-DotEnvValue '.env' 'PAYOUT_ENCRYPTION_KEY' (New-Secret)
  Ok 'Đã tạo .env và sinh secret development ngẫu nhiên.'
} else {
  Ok '.env đã tồn tại; không ghi đè.'
}

if (-not $SkipInstall) {
  $dependencySource = if (Test-Path 'package-lock.json') { 'package-lock.json' } else { 'package.json' }
  $dependencyHash = (Get-FileHash $dependencySource -Algorithm SHA256).Hash
  $hashPath = 'node_modules\.xiii-dependencies.sha256'
  $installedHash = if (Test-Path $hashPath) { (Get-Content $hashPath -Raw).Trim() } else { '' }
  if (-not (Test-Path 'node_modules') -or $installedHash -ne $dependencyHash) {
    Step 'Cài hoặc cập nhật dependencies'
    if (Test-Path 'package-lock.json') { & npm ci } else { & npm install }
    if ($LASTEXITCODE -ne 0) { Fail 'Cài dependencies thất bại. Chạy DIAGNOSE_XIII_WINDOWS.bat và gửi file diagnostics.' }
    $dependencyHash = (Get-FileHash $dependencySource -Algorithm SHA256).Hash
    [IO.File]::WriteAllText((Join-Path $root $hashPath), $dependencyHash, (New-Object Text.UTF8Encoding($false)))
    Ok 'Dependencies đã được đồng bộ.'
  } else {
    Ok 'Dependencies khớp phiên bản hiện tại.'
  }
} else {
  Write-Host '[SKIP] npm install' -ForegroundColor Yellow
}

Step 'Kiểm tra source/runtime readiness'
& npm run verify:runtime-readiness
if ($LASTEXITCODE -ne 0) { Fail 'verify:runtime-readiness thất bại.' }
Ok 'Runtime readiness PASS.'

if (-not $SkipTypecheck) {
  Step 'Typecheck toàn workspace'
  & npm run typecheck
  if ($LASTEXITCODE -ne 0) { Fail 'Typecheck thất bại. Chưa khởi động app để tránh che lỗi build.' }
  Ok 'Typecheck PASS.'
} else {
  Write-Host '[SKIP] typecheck' -ForegroundColor Yellow
}

Step 'Bật MongoDB replica set + Redis + MinIO'
& docker compose up -d mongodb mongo-init-replica redis minio minio-init
if ($LASTEXITCODE -ne 0) { Fail 'docker compose up thất bại.' }

Step 'Chờ MongoDB replica set sẵn sàng'
$mongoReady = $false
for ($i=0; $i -lt 60; $i++) {
  $result = (& docker compose exec -T mongodb mongosh --quiet --eval 'try { print(rs.status().ok) } catch(e) { print(0) }' 2>$null | Out-String).Trim()
  if ($LASTEXITCODE -eq 0 -and $result.EndsWith('1')) { $mongoReady = $true; break }
  Start-Sleep -Seconds 2
}
if (-not $mongoReady) { Fail 'MongoDB replica set chưa sẵn sàng sau 120 giây.' }
Ok 'MongoDB replica set sẵn sàng.'

Step 'Kiểm tra Redis và MinIO'
$redis = (& docker compose exec -T redis redis-cli ping 2>$null | Out-String).Trim()
if ($redis -ne 'PONG') { Fail 'Redis chưa sẵn sàng.' }
Ok 'Redis PONG.'

$minioReady = $false
for ($i=0; $i -lt 30; $i++) {
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:9000/minio/health/live' -TimeoutSec 3
    if ($resp.StatusCode -eq 200) { $minioReady = $true; break }
  } catch {}
  Start-Sleep -Seconds 2
}
if (-not $minioReady) { Fail 'MinIO chưa sẵn sàng.' }
Ok 'MinIO sẵn sàng.'

if (-not $SkipSeed) {
  Step 'Seed dữ liệu development'
  & npm run seed --workspace services/api
  if ($LASTEXITCODE -ne 0) { Fail 'Seed database thất bại.' }
  Ok 'Seed database PASS.'
} else {
  Write-Host '[SKIP] seed database' -ForegroundColor Yellow
}

Write-Host "`n============================================================" -ForegroundColor DarkGray
Write-Host 'XIII local infrastructure đã sẵn sàng.' -ForegroundColor Green
Write-Host 'Buyer : http://localhost:3000'
Write-Host 'Seller: http://localhost:3001'
Write-Host 'Admin : http://localhost:3002'
Write-Host 'API   : http://localhost:4000/api/v1/health/ready'
Write-Host 'MinIO : http://localhost:9001'
Write-Host ''
Write-Host 'Demo password: Xiii12345!'
Write-Host 'buyer@xiii.local | seller@xiii.local | admin@xiii.local'
Write-Host "============================================================`n" -ForegroundColor DarkGray

Step 'Khởi động API + Buyer + Seller + Admin'
Write-Host 'Giữ cửa sổ này mở. Nhấn Ctrl+C để dừng dev servers.' -ForegroundColor Yellow
Write-Host 'Docker data vẫn được giữ lại; dùng STOP_XIII_INFRA.bat để dừng infrastructure.' -ForegroundColor Yellow
& npm run dev
exit $LASTEXITCODE
