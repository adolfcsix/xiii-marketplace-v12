param([switch]$ResetData)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root
if ($ResetData) {
  Write-Host 'CẢNH BÁO: thao tác này sẽ xóa MongoDB/Redis/MinIO volumes local.' -ForegroundColor Red
  $answer = Read-Host 'Gõ RESET để xác nhận'
  if ($answer -ne 'RESET') { Write-Host 'Đã hủy.'; exit 0 }
  docker compose down -v --remove-orphans
} else {
  docker compose down --remove-orphans
}
exit $LASTEXITCODE
