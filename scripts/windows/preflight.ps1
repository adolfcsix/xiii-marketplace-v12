param(
  [switch]$AllowBusyPorts
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root

function Write-Ok($msg) { Write-Host "[PASS] $msg" -ForegroundColor Green }
function Write-WarnMsg($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; exit 1 }

Write-Host "XIII Marketplace - Windows Local Preflight" -ForegroundColor Cyan
Write-Host "Project: $root`n"

# Node.js
try {
  $nodeVersionRaw = (& node --version).Trim()
} catch { Fail 'Node.js chưa được cài hoặc chưa có trong PATH. Cài Node.js 20/22 LTS rồi chạy lại.' }
$nodeMajor = [int](($nodeVersionRaw -replace '^v','').Split('.')[0])
if ($nodeMajor -lt 20) { Fail "Node.js $nodeVersionRaw quá cũ. Hãy dùng Node.js >= 20." }
Write-Ok "Node.js $nodeVersionRaw"

# npm
try {
  $npmVersion = (& npm --version).Trim()
} catch { Fail 'npm chưa sẵn sàng trong PATH.' }
Write-Ok "npm $npmVersion"

# Docker CLI + Compose + engine
try { $dockerVersion = (& docker --version).Trim() } catch { Fail 'Docker chưa được cài. Cài Docker Desktop rồi chạy lại.' }
Write-Ok $dockerVersion

& docker compose version *> $null
if ($LASTEXITCODE -ne 0) { Fail 'Docker Compose v2 không khả dụng. Docker Desktop cần có lệnh `docker compose`.' }
Write-Ok ((& docker compose version).Trim())

& docker info *> $null
if ($LASTEXITCODE -ne 0) { Fail 'Docker Desktop đã cài nhưng Docker Engine chưa chạy. Hãy mở Docker Desktop và chờ Engine Ready.' }
Write-Ok 'Docker Engine đang chạy'

# Project files
foreach ($required in @('package.json','docker-compose.yml','.env.example')) {
  if (-not (Test-Path (Join-Path $root $required))) { Fail "Thiếu file bắt buộc: $required" }
}
Write-Ok 'Cấu trúc project cơ bản đầy đủ'

# Ports
$ports = @(3000,3001,3002,4000,27017,6379,9000,9001)
$busy = @()
foreach ($port in $ports) {
  $listeners = @()
  try {
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
  } catch {
    $netstat = netstat -ano | Select-String -Pattern (":$port\s+.*LISTENING")
    if ($netstat) { $listeners = @($netstat) }
  }
  if ($listeners.Count -gt 0) { $busy += $port }
}

if ($busy.Count -gt 0) {
  if ($AllowBusyPorts) { Write-WarnMsg ("Các port đang bận: " + ($busy -join ', ') + '. Bạn đã cho phép bỏ qua.') }
  else { Fail ("Các port đang bận: " + ($busy -join ', ') + '. Hãy đóng service đang dùng các port này hoặc chạy preflight với -AllowBusyPorts nếu đó chính là XIII.') }
} else {
  Write-Ok 'Các port 3000/3001/3002/4000/27017/6379/9000/9001 đang trống'
}

if (Test-Path '.env') { Write-Ok '.env đã tồn tại' } else { Write-WarnMsg '.env chưa có; start-local.ps1 sẽ tạo từ .env.example và sinh secret development mới.' }
if (Test-Path 'node_modules') { Write-Ok 'node_modules đã tồn tại' } else { Write-WarnMsg 'node_modules chưa có; start-local.ps1 sẽ chạy npm install.' }

Write-Host "`nPreflight hoàn tất." -ForegroundColor Cyan
exit 0
