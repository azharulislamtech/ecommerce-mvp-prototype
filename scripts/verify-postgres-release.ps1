$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backupDir = Get-ChildItem (Join-Path $taskRoot '.private-backups') -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'database.dump') } | Sort-Object Name -Descending | Select-Object -First 1
if (-not $backupDir) { throw 'Create the production backup first.' }
$scratch = Join-Path $backupDir.FullName ('restore-drill-' + (Get-Date -Format 'HHmmss'))
$cluster = Join-Path $scratch 'cluster'
New-Item -ItemType Directory -Path $scratch -Force | Out-Null
$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
$password = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$passwordFile = Join-Path $scratch 'local-password.txt'
[IO.File]::WriteAllText($passwordFile,$password)
$previousPassword = $env:PGPASSWORD
$started = $false
try {
  $env:PGPASSWORD = $password
  & (Join-Path $pgBin 'initdb.exe') -D $cluster -U postgres -A scram-sha-256 --pwfile=$passwordFile > (Join-Path $scratch 'initdb.log') 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'Isolated PostgreSQL initialization failed.' }
  $startArgs = '-D "' + $cluster + '" -l "' + (Join-Path $scratch 'postgres.log') + '" -o "-p 55439 -h 127.0.0.1" -w start'
  $starter = Start-Process -FilePath (Join-Path $pgBin 'pg_ctl.exe') -ArgumentList $startArgs -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $scratch 'start.log') -RedirectStandardError (Join-Path $scratch 'start.error.log')
  $starter.WaitForExit()
  if ($starter.ExitCode -ne 0) { throw 'Isolated PostgreSQL startup failed.' }
  $started = $true
  $connectionArgs = @('-h','127.0.0.1','-p','55439','-U','postgres','-d','postgres')
  function Invoke-LocalSql([string]$sql) {
    $result = & (Join-Path $pgBin 'psql.exe') @connectionArgs -X -v ON_ERROR_STOP=1 -At -c $sql
    if ($LASTEXITCODE -ne 0) { throw 'Isolated database verification failed.' }
    return $result
  }
  Invoke-LocalSql 'create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema extensions; create extension pgcrypto with schema extensions;' | Out-Null
  Invoke-LocalSql 'create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid; $$;' | Out-Null
  & (Join-Path $pgBin 'pg_restore.exe') @connectionArgs --schema=public --no-owner --no-acl --exit-on-error --single-transaction (Join-Path $backupDir.FullName 'database.dump') > (Join-Path $scratch 'restore.log') 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'Application-schema restore failed; do not migrate production.' }
  $baseline = Invoke-LocalSql 'select json_build_object(''orders'',(select count(*) from orders),''products'',(select count(*) from products),''payments'',(select count(*) from payments),''stock'',(select sum(stock_quantity) from products));'
  $flywayConfig = Join-Path $scratch 'flyway.conf'
  @("flyway.url=jdbc:postgresql://127.0.0.1:55439/postgres",'flyway.user=postgres',"flyway.password=$password",'flyway.defaultSchema=public',"flyway.locations=filesystem:$($taskRoot.Replace('\','/'))/db/migration",'flyway.cleanDisabled=true') | Set-Content -LiteralPath $flywayConfig
  & 'C:\Program Files\flyway\flyway.cmd' "-configFiles=$flywayConfig" migrate
  if ($LASTEXITCODE -ne 0) { throw 'Restored PostgreSQL migration failed; do not migrate production.' }
  $afterMigration = Invoke-LocalSql 'select json_build_object(''orders'',(select count(*) from orders),''products'',(select count(*) from products),''payments'',(select count(*) from payments),''stock'',(select sum(stock_quantity) from products));'
  if ($baseline -ne $afterMigration) { throw 'Migration changed business row counts or inventory unexpectedly.' }
  $productId = [Guid]::NewGuid().ToString()
  $requestId = [Guid]::NewGuid().ToString()
  Invoke-LocalSql "insert into products(id,name,slug,price,stock_quantity,is_active) values('$productId','Isolated restore test','restore-$productId',100,10,true);" | Out-Null
  $checkout = "select order_id from create_checkout_order('Isolated test','01711111111','Dhaka','Disposable local address','','cash-on-delivery','[{`"product_id`":`"$productId`",`"quantity`":2}]'::jsonb,'$requestId'::uuid,null);"
  $queryFile = Join-Path $scratch 'concurrent-checkout.sql'
  [IO.File]::WriteAllText($queryFile,$checkout)
  $processes = @()
  foreach ($index in 1..3) {
    $arguments = '-h 127.0.0.1 -p 55439 -U postgres -d postgres -X -v ON_ERROR_STOP=1 -At -f "' + $queryFile + '"'
    $processes += Start-Process -FilePath (Join-Path $pgBin 'psql.exe') -ArgumentList $arguments -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $scratch "checkout-$index.log") -RedirectStandardError (Join-Path $scratch "checkout-$index.error.log")
  }
  foreach ($process in $processes) { $process.WaitForExit(); if ($process.ExitCode -ne 0) { throw 'Concurrent checkout failed.' } }
  $concurrency = Invoke-LocalSql "select (select count(*) from checkout_requests where request_id='$requestId')=1 and (select stock_quantity from products where id='$productId')=8 and (select count(distinct order_id) from checkout_requests where request_id='$requestId')=1;"
  if ($concurrency -ne 't') { throw 'Independent-session idempotency check failed.' }
  $cancellation = Invoke-LocalSql "begin; update orders set order_status='cancelled' where id=(select order_id from checkout_requests where request_id='$requestId'); update orders set order_status='cancelled' where id=(select order_id from checkout_requests where request_id='$requestId'); select stock_quantity=10 from products where id='$productId'; rollback;"
  if ($cancellation -notcontains 't') { throw 'Restored inventory cancellation check failed.' }
  @{ verifiedAt=(Get-Date).ToUniversalTime().ToString('o'); restored='production public schema and data'; postgres='18'; migrations='Flyway V8-V10'; businessBaselinePreserved=$true; independentConcurrentSessions=3; idempotencyPassed=$true; cancellationPassed=$true; cloudPlatformRestore=$false } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backupDir.FullName 'restore-verification.json') -Encoding utf8
  Write-Output 'Application database restored; pending migrations applied; baseline preserved; 3 independent concurrent checkout sessions and cancellation passed.'
} finally {
  if ($started) { & (Join-Path $pgBin 'pg_ctl.exe') -D $cluster -m fast -w stop | Out-Null }
  $env:PGPASSWORD = $previousPassword
  Remove-Item -LiteralPath $passwordFile -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath (Join-Path $scratch 'flyway.conf') -ErrorAction SilentlyContinue
}
