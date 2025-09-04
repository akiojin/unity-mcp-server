Param(
    [string] $Version,
    [string] $Rid,
    [string] $Dest = ".unity/tools/roslyn-cli",
    [switch] $Yes,
    [string] $Token
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Detect-Rid {
    if ($IsWindows) { return 'win-x64' }
    if ($IsMacOS) {
        $arch = (uname -m)
        if ($arch -eq 'arm64' -or $arch -eq 'aarch64') { return 'osx-arm64' } else { return 'osx-x64' }
    }
    return 'linux-x64'
}

function Detect-VersionFromPkg {
    # Prefer tools/roslyn-cli-npx version (tracks roslyn-cli releases)
    $pkg = Join-Path 'tools' 'roslyn-cli-npx' 'package.json'
    if (Test-Path $pkg) {
        try {
            $json = Get-Content $pkg -Raw | ConvertFrom-Json
            return $json.version
        } catch {}
    }
    return $null
}

function Invoke-HttpGetText([string]$Url) {
    $headers = @{ 'User-Agent' = 'unity-editor-mcp' }
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    return (Invoke-WebRequest -UseBasicParsing -Headers $headers -Uri $Url).Content
}

function Download-To([string]$Url, [string]$Path) {
    $headers = @{ 'User-Agent' = 'unity-editor-mcp' }
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    Invoke-WebRequest -Headers $headers -Uri $Url -OutFile $Path
}

function Get-FileSha256([string]$Path) {
    try { return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLower() } catch { return $null }
}

if (-not $Rid) { $Rid = Detect-Rid }
if (-not $Version) { $Version = Detect-VersionFromPkg }

$exeName = if ($Rid -eq 'win-x64') { 'roslyn-cli.exe' } else { 'roslyn-cli' }
$tagUrl = if ($Version) { "https://api.github.com/repos/akiojin/unity-editor-mcp/releases/tags/roslyn-cli-v$Version" } else { 'https://api.github.com/repos/akiojin/unity-editor-mcp/releases/latest' }

Write-Host "[install] Resolving release info ($tagUrl)"
$jsonText = Invoke-HttpGetText $tagUrl
if (-not $jsonText) { throw "Failed to fetch release info" }
$json = $jsonText | ConvertFrom-Json

# Find asset url containing RID
$asset = $json.assets | Where-Object { $_.browser_download_url -match [Regex]::Escape($Rid) } | Select-Object -First 1
if (-not $asset) { throw "No asset found for RID $Rid" }

$sumAsset = $json.assets | Where-Object { $_.name -match 'checksum|sha256|SUM' } | Select-Object -First 1

$destDir = Join-Path $Dest $Rid
New-Item -ItemType Directory -Force -Path $destDir | Out-Null
$tmp = Join-Path $destDir ($exeName + '.download')
Write-Host "[install] Downloading asset -> $tmp"
Download-To $asset.browser_download_url $tmp

if ($sumAsset) {
    Write-Host "[install] Downloading checksums"
    $sums = Invoke-HttpGetText $sumAsset.browser_download_url
    if ($sums) {
        $line = ($sums -split "`n") | Where-Object { $_ -match [Regex]::Escape($asset.name) } | Select-Object -First 1
        if ($line) {
            $expected = ($line -split '\s+')[0]
            $actual = Get-FileSha256 $tmp
            if ($actual -and ($expected.ToLower() -ne $actual.ToLower())) {
                Remove-Item -Force $tmp
                throw "Checksum mismatch: expected=$expected actual=$actual"
            }
        }
    }
}

$final = Join-Path $destDir $exeName
if (Test-Path $final -and -not $Yes) {
    $ans = Read-Host "Replace existing $final? [y/N]"
    if ($ans -ne 'y' -and $ans -ne 'Y') {
        Remove-Item -Force $tmp
        Write-Host "[install] Aborted by user"
        exit 0
    }
}

Move-Item -Force $tmp $final
if ($Rid -ne 'win-x64') {
    try { & chmod 0755 $final | Out-Null } catch {}
}
Write-Host "[install] Installed: $final"
