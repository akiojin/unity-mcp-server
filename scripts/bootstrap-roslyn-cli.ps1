Param(
  [string]$Rid
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Push-Location $Root

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
  Write-Error 'dotnet SDK is required. Please install .NET 8+'
  exit 1
}

if (-not $Rid) { $Rid = 'win-x64' }

$OutDir = ".tools/roslyn-cli/$Rid"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Write-Host "Publishing roslyn-cli for RID=$Rid ..."
dotnet publish roslyn-cli/roslyn-cli.csproj -c Release -r $Rid --self-contained true -o $OutDir

Write-Host "Done. Binary at $OutDir"
Pop-Location

