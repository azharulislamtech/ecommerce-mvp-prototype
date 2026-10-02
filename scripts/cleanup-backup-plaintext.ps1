$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$privateRoot = (Resolve-Path (Join-Path $taskRoot '.private-backups')).Path
$backupDir = Get-ChildItem $privateRoot -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'database.dump') } | Sort-Object Name -Descending | Select-Object -First 1
if (-not $backupDir) { throw 'No temporary plaintext backup found.' }
$boundary = $backupDir.FullName + [IO.Path]::DirectorySeparatorChar
if (-not $backupDir.FullName.StartsWith($privateRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid backup directory.' }
Add-Type -AssemblyName System.Security
Add-Type -AssemblyName System.IO.Compression
$plain = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes((Join-Path $backupDir.FullName 'recovery.zip.protected')),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
$stream = [IO.MemoryStream]::new($plain)
$zip = [IO.Compression.ZipArchive]::new($stream)
try {
  $entry = $zip.GetEntry('database.dump')
  if (-not $entry) { throw 'Encrypted recovery archive has no database dump.' }
  $entryStream = $entry.Open()
  $sha = [Security.Cryptography.SHA256]::Create()
  try { $archiveHash=[Convert]::ToBase64String($sha.ComputeHash($entryStream)) } finally { $entryStream.Dispose() }
  $dumpStream = [IO.File]::OpenRead((Join-Path $backupDir.FullName 'database.dump'))
  try { $dumpHash=[Convert]::ToBase64String($sha.ComputeHash($dumpStream)) } finally { $dumpStream.Dispose() }
  if ($archiveHash -ne $dumpHash) { throw 'Encrypted database archive differs from the restored backup; keep plaintext.' }
} finally { $zip.Dispose(); $stream.Dispose() }
if (-not (Test-Path (Join-Path $backupDir.FullName 'restore-verification.json'))) { throw 'Complete the restore verification first.' }
$targets = @((Get-Item (Join-Path $backupDir.FullName 'database.dump')),(Get-Item (Join-Path $backupDir.FullName 'storage')))
$targets += Get-ChildItem $backupDir.FullName -Directory | Where-Object { $_.Name -match '^restore-drill(?:-\d{6})?$' }
foreach ($target in $targets) {
  $resolved = [IO.Path]::GetFullPath($target.FullName)
  if (-not $resolved.StartsWith($boundary,[StringComparison]::OrdinalIgnoreCase) -or ($target.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Unsafe cleanup target.' }
  if ($target.PSIsContainer -and (Test-Path (Join-Path $resolved 'cluster/postmaster.pid'))) { throw 'Stop the isolated database before cleanup.' }
}
foreach ($target in $targets) { Remove-Item -LiteralPath $target.FullName -Recurse -Force }
Write-Output 'Verified encrypted recovery archive retained; temporary plaintext database, images and stopped restore clusters removed.'
