$ErrorActionPreference = 'Stop'

Write-Host 'Verifying backend...'
Push-Location "$PSScriptRoot\backend"
try {
    .\mvnw.cmd --batch-mode verify
} finally {
    Pop-Location
}

Write-Host 'Verifying UI...'
Push-Location "$PSScriptRoot\ui"
try {
    npm ci
    npm run lint -- --max-warnings=0
    npm test
    npm run build
    npm audit --omit=dev --audit-level=high
} finally {
    Pop-Location
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host 'Validating Docker Compose configuration...'
    $env:GOOGLE_CLIENT_ID = 'verification-client-id.apps.googleusercontent.com'
    docker compose -f "$PSScriptRoot\deployment\docker-compose.yml" config --quiet
}

Write-Host 'Archly verification completed successfully.'
