$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backupRoot = Join-Path $taskRoot '.private-backups'
$backupDir = Join-Path $backupRoot (Get-Date -Format 'yyyyMMdd-HHmmss')
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$config = @{}
Get-Content -LiteralPath (Join-Path $taskRoot 'flyway.conf') | ForEach-Object {
  if ($_ -match '^\s*(flyway\.[^=]+)=(.*)$') { $config[$matches[1]] = $matches[2].Trim() }
}
$connection = [Uri]($config['flyway.url'] -replace '^jdbc:', '')
$database = $connection.AbsolutePath.TrimStart('/')
$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
$previousPassword = $env:PGPASSWORD
$previousSsl = $env:PGSSLMODE
try {
  $env:PGPASSWORD = $config['flyway.password']
  $env:PGSSLMODE = 'require'
  $connectionArgs = @('-h', $connection.Host, '-p', [string]$connection.Port, '-U', $config['flyway.user'], '-d', $database)
  & (Join-Path $pgBin 'psql.exe') @connectionArgs -X -v ON_ERROR_STOP=1 -At -c "select json_build_object('orders',(select count(*) from public.orders),'products',(select count(*) from public.products),'payments',(select count(*) from public.payments),'cancelled',(select count(*) from public.orders where order_status='cancelled'),'payment_mismatches',(select count(*) from public.orders o join public.payments p on p.order_id=o.id where o.payment_status is distinct from p.payment_status));"
  if ($LASTEXITCODE -ne 0) { throw 'Read-only baseline query failed.' }
  $dumpPath = Join-Path $backupDir 'database.dump'
  & (Join-Path $pgBin 'pg_dump.exe') @connectionArgs -Fc --no-owner --no-acl --file=$dumpPath
  if ($LASTEXITCODE -ne 0) { throw 'Database backup failed; do not migrate.' }
  & (Join-Path $pgBin 'pg_restore.exe') --list $dumpPath | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Database archive validation failed.' }
  $storagePath = Join-Path $backupDir 'storage'
  Push-Location $taskRoot
  try { node --env-file=.env.local scripts/backup-storage.mjs $storagePath } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { throw 'Storage backup failed; do not migrate.' }
  $zipPath = Join-Path $backupDir 'recovery.zip'
  Compress-Archive -Path $dumpPath,$storagePath -DestinationPath $zipPath
  Add-Type -AssemblyName System.Security
  $plain = [IO.File]::ReadAllBytes($zipPath)
  $encrypted = [Security.Cryptography.ProtectedData]::Protect($plain,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $protectedPath = Join-Path $backupDir 'recovery.zip.protected'
  [IO.File]::WriteAllBytes($protectedPath,$encrypted)
  $check = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($protectedPath),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $sha = [Security.Cryptography.SHA256]::Create()
  if ([Convert]::ToBase64String($sha.ComputeHash($plain)) -ne [Convert]::ToBase64String($sha.ComputeHash($check))) { throw 'Encrypted backup verification failed.' }
  $manifest = @{ createdAt=(Get-Date).ToUniversalTime().ToString('o'); encryptedArchive='recovery.zip.protected'; databaseBytes=(Get-Item $dumpPath).Length; encryption='Windows DPAPI CurrentUser'; encryptionRoundTripVerified=$true; cloudRestoreVerified=$false }
  $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backupDir 'manifest.json') -Encoding utf8
  Remove-Item -LiteralPath $zipPath
  # Retain the private dump temporarily for the authorized isolated restore drill.
  Write-Output ('Verified encrypted backup: ' + $protectedPath)
} finally {
  $env:PGPASSWORD = $previousPassword
  $env:PGSSLMODE = $previousSsl
}
