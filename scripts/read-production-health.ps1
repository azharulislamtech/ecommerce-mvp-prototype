param([switch]$VerifyTransactions)
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$config = @{}
Get-Content -LiteralPath (Join-Path $taskRoot 'flyway.conf') | ForEach-Object {
  if ($_ -match '^\s*(flyway\.[^=]+)=(.*)$') { $config[$matches[1]] = $matches[2].Trim() }
}
$connection = [Uri]($config['flyway.url'] -replace '^jdbc:', '')
$previousPassword = $env:PGPASSWORD
$previousSsl = $env:PGSSLMODE
try {
  $env:PGPASSWORD = $config['flyway.password']; $env:PGSSLMODE = 'require'
  $query = @'
begin transaction read only;
select json_build_object('schema_version',(select max(version::integer) from flyway_schema_history where success),
  'orders',(select count(*) from orders),'products',(select count(*) from products),'payments',(select count(*) from payments),
  'stock_total',(select sum(stock_quantity) from products),'cancelled',(select count(*) from orders where order_status='cancelled'),
  'payment_mismatches',(select count(*) from orders o join payments p on p.order_id=o.id where o.payment_status is distinct from p.payment_status));
select json_agg(x) from (select o.payment_status as order_status,p.payment_status as payment_status,p.gateway_name,count(*) as count
  from orders o join payments p on p.order_id=o.id where o.payment_status is distinct from p.payment_status
  group by o.payment_status,p.payment_status,p.gateway_name) x;
rollback;
'@
  if ($VerifyTransactions) { $query = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'verify-production-transactions.sql') -Raw }
  & 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h $connection.Host -p $connection.Port -U $config['flyway.user'] -d $connection.AbsolutePath.TrimStart('/') -X -v ON_ERROR_STOP=1 -At -c $query
  if ($LASTEXITCODE -ne 0) { throw 'Read-only database health query failed.' }
} finally { $env:PGPASSWORD=$previousPassword; $env:PGSSLMODE=$previousSsl }
