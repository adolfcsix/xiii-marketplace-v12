$ErrorActionPreference = 'Continue'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root
$dir = Join-Path $root 'diagnostics'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$out = Join-Path $dir "xiii-diagnostics-$stamp.txt"

function Add-Line([string]$line='') { Add-Content -Path $out -Value $line -Encoding UTF8 }
function Capture([string]$title,[scriptblock]$block) {
  Add-Line ''; Add-Line "===== $title ====="
  try {
    $text = & $block 2>&1 | Out-String
    Add-Line $text.TrimEnd()
  } catch { Add-Line ("ERROR: " + $_.Exception.Message) }
}

Add-Line 'XIII MARKETPLACE - LOCAL DIAGNOSTICS'
Add-Line ("Generated: " + (Get-Date).ToString('o'))
Add-Line ("Project: " + $root)

Capture 'OS' { Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,OSArchitecture }
Capture 'Node' { node --version }
Capture 'npm' { npm --version }
Capture 'Docker' { docker --version }
Capture 'Docker Compose' { docker compose version }
Capture 'Docker Info Summary' { docker info --format 'Server={{.ServerVersion}} OSType={{.OSType}} CPUs={{.NCPU}} Memory={{.MemTotal}}' }
Capture 'Compose PS' { docker compose ps }
Capture 'Mongo Logs (last 80)' { docker compose logs --no-color --tail 80 mongodb mongo-init-replica }
Capture 'Redis Logs (last 50)' { docker compose logs --no-color --tail 50 redis }
Capture 'MinIO Logs (last 50)' { docker compose logs --no-color --tail 50 minio minio-init }
Capture 'Listening Ports' {
  $ports = 3000,3001,3002,4000,27017,6379,9000,9001
  foreach ($p in $ports) {
    try { Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess }
    catch { netstat -ano | Select-String -Pattern (":$p\s+.*LISTENING") }
  }
}
Capture 'API Health Live' { Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4000/api/v1/health/live' -TimeoutSec 5 | Select-Object StatusCode,Content }
Capture 'API Health Ready' { Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4000/api/v1/health/ready' -TimeoutSec 5 | Select-Object StatusCode,Content }
Capture 'Buyer HTTP' { (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000' -TimeoutSec 5).StatusCode }
Capture 'Seller HTTP' { (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3001/login' -TimeoutSec 5).StatusCode }
Capture 'Admin HTTP' { (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3002/login' -TimeoutSec 5).StatusCode }
Capture 'Runtime Readiness' { npm run verify:runtime-readiness }

if (Test-Path '.env') {
  Add-Line ''; Add-Line '===== ENV KEY PRESENCE (VALUES REDACTED) ====='
  foreach ($line in Get-Content '.env') {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=') { Add-Line ($Matches[1] + '=***REDACTED***') }
  }
} else { Add-Line ''; Add-Line 'ENV: .env does not exist.' }

Write-Host "Diagnostics đã tạo: $out" -ForegroundColor Green
Write-Host 'File này không ghi giá trị secret trong .env.' -ForegroundColor Yellow
