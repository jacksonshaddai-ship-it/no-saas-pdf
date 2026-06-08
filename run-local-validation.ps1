$ErrorActionPreference = "Stop"

Write-Host "=== PDF Master Pro - setup/teste local automatico ===" -ForegroundColor Cyan

Write-Host "1) Criando .env.local e .env de teste..." -ForegroundColor Yellow

@"
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="dev-secret-pdf-master-pro-local"
NEXTAUTH_URL="http://localhost:3010"

APP_URL="http://localhost:3010"

CLOUDCONVERT_API_KEY="mock-key-for-test"
CLOUDCONVERT_API_URL="http://localhost:3500/v2"

UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
ANON_HASH_SALT="dev-salt-do-not-use-in-prod"

PAYMENT_PROVIDER_BR="mercado_pago"
PAYMENT_PROVIDER_GLOBAL="stripe"

MERCADO_PAGO_ACCESS_TOKEN="mock-mp-token"
MERCADO_PAGO_PUBLIC_KEY="mock-mp-public"
MERCADO_PAGO_WEBHOOK_SECRET="mock-mp-webhook"

STRIPE_SECRET_KEY="mock-stripe-secret"
STRIPE_PUBLIC_KEY="mock-stripe-public"
STRIPE_WEBHOOK_SECRET="mock-stripe-webhook"

BILLING_SKIP_WEBHOOK_SIG="1"
"@ | Set-Content -Encoding UTF8 .env.local

Copy-Item .env.local .env -Force

Write-Host "2) Instalando dependencias..." -ForegroundColor Yellow
npm.cmd install

Write-Host "3) Gerando banco local SQLite..." -ForegroundColor Yellow
npm.cmd run prisma:push

Write-Host "4) Rodando build..." -ForegroundColor Yellow
npm.cmd run build

Write-Host "5) Encerrando processos antigos nas portas 3010, 3500, 3600, 3700..." -ForegroundColor Yellow
$ports = @(3010,3500,3600,3700)
foreach ($port in $ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  foreach ($conn in $connections) {
    try {
      Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    } catch {}
  }
}

Write-Host "6) Subindo servidor Next em http://localhost:3010 ..." -ForegroundColor Yellow
$logPath = Join-Path (Get-Location) "local-next-server.log"
if (Test-Path $logPath) { Remove-Item $logPath -Force }

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$PWD`"; npm.cmd run dev -- -p 3010 *>&1 | Tee-Object -FilePath local-next-server.log"

Write-Host "7) Aguardando servidor ficar pronto..." -ForegroundColor Yellow
$ready = $false
for ($i = 1; $i -le 120; $i++) {
  try {
    $res = Invoke-WebRequest -Uri "http://localhost:3010" -UseBasicParsing -TimeoutSec 2
    if ($res.StatusCode -eq 200) {
      $ready = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}

if (-not $ready) {
  Write-Host "ERRO: servidor nao ficou pronto. Veja local-next-server.log" -ForegroundColor Red
  exit 1
}

Write-Host "Servidor pronto." -ForegroundColor Green

Write-Host "8) Rodando testes oficiais..." -ForegroundColor Yellow

npm.cmd run test:phase4
npm.cmd run test:phase5
npm.cmd run test:phase6

$env:HOMOLOGATION_BASE_URL="http://localhost:3010"
npm.cmd run test:phase7

Write-Host "=== FINALIZADO: build e testes locais concluidos ===" -ForegroundColor Green
