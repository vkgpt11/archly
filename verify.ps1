$ErrorActionPreference = 'Stop'

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$Description
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Description failed with exit code $LASTEXITCODE."
    }
}

Write-Host 'Verifying backend...'
Push-Location "$PSScriptRoot\backend"
try {
    Invoke-Checked { .\mvnw.cmd --batch-mode verify } 'Backend verification'
} finally {
    Pop-Location
}

Write-Host 'Verifying UI...'
Push-Location "$PSScriptRoot\ui"
try {
    Invoke-Checked { npm ci } 'UI dependency installation'
    Invoke-Checked { npm run lint -- --max-warnings=0 } 'UI lint'
    Invoke-Checked { npm test } 'UI tests'
    Invoke-Checked { npm run build } 'UI build'
    Invoke-Checked { npm audit --omit=dev --audit-level=high } 'UI dependency audit'
} finally {
    Pop-Location
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host 'Validating Docker Compose configuration...'
    $env:GOOGLE_CLIENT_ID = 'verification-client-id.apps.googleusercontent.com'
    Invoke-Checked { docker compose -f "$PSScriptRoot\deployment\docker-compose.yml" config --quiet } 'Docker Compose validation'
}

Write-Host 'Archly verification completed successfully.'
