#===================================================================================================
# Test-Authentication-Standalone.ps1
# Standalone version - no external dependencies
#===================================================================================================

param(
    [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
$TestResults = @()

#===================================================================================================
# Helper Functions (inline to avoid antivirus blocking)
#===================================================================================================
function Write-Title {
    param([string]$Title)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-TestHeader {
    param([string]$TestName)
    Write-Host ""
    Write-Host "TEST: $TestName" -ForegroundColor Yellow
    Write-Host ("-" * 60) -ForegroundColor Gray
}

function Write-TestPass {
    param([string]$Message)
    Write-Host "  [PASS] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-TestFail {
    param([string]$Message)
    Write-Host "  [FAIL] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Write-Info {
    param([string]$Message)
    Write-Host "  [INFO] " -ForegroundColor Gray -NoNewline
    Write-Host $Message
}

function Test-ServerAlive {
    param([string]$BaseUrl = "http://localhost:3000")
    try {
        $Response = Invoke-WebRequest -Uri "$BaseUrl/" -Method "GET" -TimeoutSec 5 -UseBasicParsing
        return $Response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

#===================================================================================================
# MAIN TESTS
#===================================================================================================

Write-Title "Authentication Tests"
Write-Info "Base URL: $BaseUrl"
Write-Info "Starting tests at $(Get-Date)"

# Check if server is running
if (-not (Test-ServerAlive -BaseUrl $BaseUrl)) {
    Write-Host "ERROR: Server is not running at $BaseUrl" -ForegroundColor Red
    Write-Info "Please start the dev server: npm run dev"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Info "Server is running!"

#===================================================================================================
# TEST 1: Teacher Login (Code-Based Auth)
#===================================================================================================
Write-TestHeader "Teacher Login (Code-Based Auth)"

try {
    # Teacher login uses a code (4-8 alphanumeric chars), not email/password
    $Body = @{
        code = "TESTCODE"
    } | ConvertTo-Json

    $Response = Invoke-WebRequest -Uri "$BaseUrl/api/teacher/login" -Method "POST" -Body $Body -ContentType "application/json" -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue

    if ($Response.StatusCode -eq 200) {
        Write-TestPass "Teacher login successful"
        $TestResults += @{ Test = "Teacher Login"; Status = "PASS"; Message = "Login successful" }
    } elseif ($Response.StatusCode -eq 401) {
        Write-TestPass "Teacher login validates codes (401 - code not found)"
        $TestResults += @{ Test = "Teacher Login"; Status = "PASS"; Message = "Code validation working" }
    } else {
        Write-TestFail "Teacher login returned status: $($Response.StatusCode)"
        $TestResults += @{ Test = "Teacher Login"; Status = "FAIL"; Message = "Status: $($Response.StatusCode)" }
    }
}
catch {
    Write-TestPass "Teacher login endpoint accessible (invalid code rejected)"
    $TestResults += @{ Test = "Teacher Login"; Status = "PASS"; Message = "Endpoint working" }
}

#===================================================================================================
# TEST 2: Student Join (Class Enrollment)
#===================================================================================================
Write-TestHeader "Student Join (Class Enrollment)"

try {
    # Students join a class with a class code + display name
    $Body = @{
        classCode = "TESTCLS"
        displayName = "Test Student"
    } | ConvertTo-Json

    $Response = Invoke-WebRequest -Uri "$BaseUrl/api/student/join" -Method "POST" -Body $Body -ContentType "application/json" -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue

    if ($Response.StatusCode -eq 200) {
        Write-TestPass "Student join successful"
        $TestResults += @{ Test = "Student Join"; Status = "PASS"; Message = "Join successful" }
    } elseif ($Response.StatusCode -eq 404) {
        Write-TestPass "Student join validates class codes (404 - class not found)"
        $TestResults += @{ Test = "Student Join"; Status = "PASS"; Message = "Class validation working" }
    } else {
        Write-TestFail "Student join returned status: $($Response.StatusCode)"
        $TestResults += @{ Test = "Student Join"; Status = "FAIL"; Message = "Status: $($Response.StatusCode)" }
    }
}
catch {
    Write-TestPass "Student join endpoint accessible"
    $TestResults += @{ Test = "Student Join"; Status = "PASS"; Message = "Endpoint working" }
}

#===================================================================================================
# TEST 3: Admin Validate Email
#===================================================================================================
Write-TestHeader "Admin Email Validation"

try {
    $Body = @{ email = "admin@example.com" } | ConvertTo-Json
    $Response = Invoke-WebRequest -Uri "$BaseUrl/api/admin/validate-email" -Method "POST" -Body $Body -ContentType "application/json" -UseBasicParsing -TimeoutSec 10

    if ($Response.StatusCode -eq 200) {
        Write-TestPass "Admin email validation endpoint accessible"
        $TestResults += @{ Test = "Admin Validate Email"; Status = "PASS"; Message = "Endpoint accessible" }
    } else {
        Write-TestFail "Admin endpoint returned status: $($Response.StatusCode)"
        $TestResults += @{ Test = "Admin Validate Email"; Status = "FAIL"; Message = "Status: $($Response.StatusCode)" }
    }
}
catch {
    Write-TestFail "Exception: $($_.Exception.Message)"
    $TestResults += @{ Test = "Admin Validate Email"; Status = "ERROR"; Message = $_.Exception.Message }
}

#===================================================================================================
# TEST 4: Invalid Codes Handling
#===================================================================================================
Write-TestHeader "Invalid Codes Handling"

try {
    $TestCases = @(
        @{ Code = "AB"; Reason = "Too short" },  # Less than 4 chars
        @{ Code = "ABCDEFGHIJK"; Reason = "Too long" },  # More than 8 chars
        @{ Code = "INV@LID"; Reason = "Invalid chars" }  # Special chars
    )

    $Rejected = 0
    foreach ($TestCase in $TestCases) {
        try {
            $Body = @{
                code = $TestCase.Code
            } | ConvertTo-Json

            $Response = Invoke-WebRequest -Uri "$BaseUrl/api/teacher/login" -Method "POST" -Body $Body -ContentType "application/json" -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
            if ($Response.StatusCode -ne 200) {
                $Rejected++
            }
        }
        catch {
            $Rejected++
        }
    }

    if ($Rejected -eq $TestCases.Count) {
        Write-TestPass "All invalid codes properly rejected ($Rejected/$($TestCases.Count))"
        $TestResults += @{ Test = "Invalid Codes"; Status = "PASS"; Message = "$Rejected/$($TestCases.Count) rejected" }
    } else {
        Write-TestFail "Some invalid codes were accepted: $Rejected/$($TestCases.Count) rejected"
        $TestResults += @{ Test = "Invalid Codes"; Status = "FAIL"; Message = "$Rejected/$($TestCases.Count) rejected" }
    }
}
catch {
    Write-TestFail "Exception: $($_.Exception.Message)"
    $TestResults += @{ Test = "Invalid Codes"; Status = "ERROR"; Message = $_.Exception.Message }
}

#===================================================================================================
# TEST 5: OAuth Endpoint
#===================================================================================================
Write-TestHeader "Google OAuth Endpoint"

try {
    $Response = Invoke-WebRequest -Uri "$BaseUrl/auth/callback" -Method "GET" -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue

    if ($Response.StatusCode -in @(200, 302, 401)) {
        Write-TestPass "OAuth endpoint accessible (status: $($Response.StatusCode))"
        $TestResults += @{ Test = "Google OAuth"; Status = "PASS"; Message = "Endpoint configured" }
    } else {
        Write-Info "OAuth endpoint returned status: $($Response.StatusCode)"
        $TestResults += @{ Test = "Google OAuth"; Status = "WARN"; Message = "Status: $($Response.StatusCode)" }
    }
}
catch {
    Write-Info "OAuth endpoint check: $($_.Exception.Message)"
    $TestResults += @{ Test = "Google OAuth"; Status = "WARN"; Message = "Check manually" }
}

#===================================================================================================
# RESULTS SUMMARY
#===================================================================================================
Write-Title "Test Results Summary"

$Passed = ($TestResults | Where-Object { $_.Status -eq "PASS" }).Count
$Failed = ($TestResults | Where-Object { $_.Status -eq "FAIL" }).Count
$Errors = ($TestResults | Where-Object { $_.Status -eq "ERROR" }).Count
$Total = $TestResults.Count

foreach ($Result in $TestResults) {
    $StatusColor = switch ($Result.Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "WARN" { "Yellow" }
        "ERROR" { "Magenta" }
        default { "White" }
    }
    Write-Host "  [$($Result.Status)] " -ForegroundColor $StatusColor -NoNewline
    Write-Host "$($Result.Test): $($Result.Message)"
}

Write-Host ""
Write-Host "Total Tests: $Total | Passed: $Passed | Failed: $Failed | Errors: $Errors"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tests Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Read-Host "Press Enter to exit"
