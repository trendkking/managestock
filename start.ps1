# MANAGESTOCK 원클릭 실행 (PowerShell)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host " MANAGESTOCK 원클릭 실행" -ForegroundColor Cyan
Write-Host " ========================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[ERROR] Node.js 가 필요합니다. https://nodejs.org" -ForegroundColor Red
  Read-Host "Enter 키를 눌러 종료"
  exit 1
}

if (-not (Get-Command python -ErrorAction SilentlyContinue) -and -not (Get-Command py -ErrorAction SilentlyContinue)) {
  Write-Host "[ERROR] Python 3 가 필요합니다. https://python.org" -ForegroundColor Red
  Read-Host "Enter 키를 눌러 종료"
  exit 1
}

npm start

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "[ERROR] 실행 중 오류가 발생했습니다." -ForegroundColor Red
  Read-Host "Enter 키를 눌러 종료"
  exit $LASTEXITCODE
}
