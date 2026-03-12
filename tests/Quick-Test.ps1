#===================================================================================================
# Quick-Test.ps1 - Simple standalone test (no external dependencies)
#===================================================================================================

param(
    [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Band2 Quick Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
Write-Host "Checking server at $BaseUrl..." -ForegroundColor Yellow
try {
    $Response = Invoke-WebRequest -Uri "$BaseUrl/" -Method "GET" -TimeoutSec 5 -UseBasicParsing
    if ($Response.StatusCode -eq 200) {
        Write-Host "  Server is RUNNING!" -ForegroundColor Green
    }
}
catch {
    Write-Host "  ERROR: Server not running!" -ForegroundColor Red
    Write-Host "  Please run: npm run dev" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test: Teacher Login" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    $Body = @{
        email = "test.teacher@teacher.band2.app"
        password = "TestPassword123!"
    } | ConvertTo-Json

    $Response = Invoke-WebRequest -Uri "$BaseUrl/api/teacher/login" -Method "POST" -Body $Body -ContentType "application/json" -UseBasicParsing -TimeoutSec 10

    Write-Host "  Status Code: $($Response.StatusCode)" -ForegroundColor Green

    if ($Response.Content) {
        $Data = $Response.Content | ConvertFrom-Json
        Write-Host "  Response: $($Data | ConvertTo-Json -Compress)" -ForegroundColor Gray
    }

    Write-Host "  [PASS] Teacher login endpoint is accessible" -ForegroundColor Green
}
catch {
    Write-Host "  [FAIL] Teacher login failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test: Student Login" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    $Body = @{
        email = "test.student@student.band2.app"
        password = "TestPassword123!"
    } | ConvertTo-Json

    $Response = Invoke-WebRequest -Uri "$BaseUrl/api/student/login" -Method "POST" -Body $Body -ContentType "application/json" -UseBasicParsing -TimeoutSec 10

    Write-Host "  Status Code: $($Response.StatusCode)" -ForegroundColor Green
    Write-Host "  [PASS] Student login endpoint is accessible" -ForegroundColor Green
}
catch {
    Write-Host "  [FAIL] Student login failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test: Admin Validate Email" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    $Body = @{
        email = "admin@example.com"
    } | ConvertTo-Json

    $Response = Invoke-WebRequest -Uri "$BaseUrl/api/admin/validate-email" -Method "POST" -Body $Body -ContentType "application/json" -UseBasicParsing -TimeoutSec 10

    Write-Host "  Status Code: $($Response.StatusCode)" -ForegroundColor Green
    Write-Host "  [PASS] Admin endpoint is accessible" -ForegroundColor Green
}
catch {
    Write-Host "  [FAIL] Admin endpoint failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tests Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Read-Host "Press Enter to exit"
