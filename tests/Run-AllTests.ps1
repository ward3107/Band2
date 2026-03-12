#===================================================================================================
# Run-AllTests.ps1
#===================================================================================================
# Description: Master test runner that executes all modular test scripts.
#              Can run all tests or specific test suites.
#
# Usage:
#   .\Run-AllTests.ps1                # Run all tests
#   .\Run-AllTests.ps1 -TestAuth      # Run only authentication tests
#   .\Run-AllTests.ps1 -TestDb        # Run only database tests
#   .\Run-AllTests.ps1 -Parallel      # Run tests in parallel (faster but harder to read)
#   .\Run-AllTests.ps1 -BaseUrl "https://staging.example.com"  # Test different environment
#===================================================================================================

#Requires -Version 7.0

param(
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "http://localhost:3000",

    [Parameter(Mandatory=$false)]
    [switch]$Parallel = $false,

    [Parameter(Mandatory=$false)]
    [switch]$ContinueOnError = $false,

    # Individual test suite flags
    [Parameter(Mandatory=$false)]
    [switch]$TestAuth = $false,

    [Parameter(Mandatory=$false)]
    [switch]$TestDb = $false,

    [Parameter(Mandatory=$false)]
    [switch]$TestApi = $false,

    [Parameter(Mandatory=$false)]
    [switch]$TestSecurity = $false,

    [Parameter(Mandatory=$false)]
    [switch]$TestClass = $false,

    [Parameter(Mandatory=$false)]
    [switch]$TestAssignment = $false,

    [Parameter(Mandatory=$false)]
    [switch]$TestDevices = $false
)

$ErrorActionPreference = "Stop"
$TestDir = $PSScriptRoot

#===================================================================================================
# Test Suite Definitions
#===================================================================================================
$TestSuites = @{
    "Authentication" = @{
        Script = Join-Path $TestDir "Test-Authentication.ps1"
        Flag = $TestAuth
        Category = "Functional"
        Priority = "Critical"
        Description = "Login, signup, session management"
    }
    "Database" = @{
        Script = Join-Path $TestDir "Test-Database.ps1"
        Flag = $TestDb
        Category = "Integration"
        Priority = "Critical"
        Description = "Supabase connectivity, CRUD, data integrity"
    }
    "API Endpoints" = @{
        Script = Join-Path $TestDir "Test-APIEndpoints.ps1"
        Flag = $TestApi
        Category = "Integration"
        Priority = "High"
        Description = "HTTP routes, status codes, CORS"
    }
    "Security" = @{
        Script = Join-Path $TestDir "Test-Security.ps1"
        Flag = $TestSecurity
        Category = "Security"
        Priority = "Critical"
        Description = "CSRF, rate limiting, XSS, SQL injection"
    }
    "Class Management" = @{
        Script = Join-Path $TestDir "Test-ClassManagement.ps1"
        Flag = $TestClass
        Category = "Functional"
        Priority = "High"
        Description = "Create/join classes, enrollment"
    }
    "Assignments" = @{
        Script = Join-Path $TestDir "Test-Assignments.ps1"
        Flag = $TestAssignment
        Category = "Functional"
        Priority = "High"
        Description = "Assignment CRUD, progress tracking"
    }
    "User Devices" = @{
        Script = Join-Path $TestDir "Test-UserDevices.ps1"
        Flag = $TestDevices
        Category = "Functional"
        Priority = "Medium"
        Description = "Device tracking, login history"
    }
}

#===================================================================================================
# Helper Functions
#===================================================================================================
function Write-Header {
    param([string]$Text)
    $Separator = "=" * 80
    Write-Host ""
    Write-Host $Separator -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host $Separator -ForegroundColor Cyan
    Write-Host ""
}

function Write-SuiteResult {
    param(
        [string]$Suite,
        [int]$ExitCode,
        [timespan]$Duration
    )

    $StatusColor = if ($ExitCode -eq 0) { "Green" } else { "Red" }
    $Status = if ($ExitCode -eq 0) { "PASSED" } else { "FAILED" }

    Write-Host "[$Suite] " -NoNewline
    Write-Host "$Status " -ForegroundColor $StatusColor -NoNewline
    Write-Host "($($Duration.TotalSeconds.ToString('0.00'))s)"
}

function Write-FinalSummary {
    param(
        [hashtable]$Results,
        [timespan]$TotalDuration
    )

    Write-Header "FINAL TEST SUMMARY"

    $TotalSuites = $Results.Count
    $PassedSuites = ($Results.Values | Where-Object { $_.ExitCode -eq 0 }).Count
    $FailedSuites = ($Results.Values | Where-Object { $_.ExitCode -ne 0 }).Count

    Write-Host "Test Suites: $TotalSuites total, $PassedSuites passed, $FailedSuites failed"
    Write-Host "Total Duration: $($TotalDuration.TotalSeconds.ToString('0.00')) seconds"
    Write-Host ""

    # Summary table
    Write-Host "Suite Results:" -ForegroundColor Yellow
    Write-Host ("-" * 80) -ForegroundColor Gray

    foreach ($Suite in $Results.Keys) {
        $Result = $Results[$Suite]
        $Status = if ($Result.ExitCode -eq 0) { "PASS" } else { "FAIL" }
        $StatusColor = if ($Result.ExitCode -eq 0) { "Green" } else { "Red" }

        Write-Host "  " -NoNewline
        Write-Host ("{0,-20}" -f $Suite) -NoNewline
        Write-Host ("{0,-8}" -f $Status) -ForegroundColor $StatusColor -NoNewline
        Write-Host (" ({0:N2}s)" -f $Result.Duration.TotalSeconds)
    }

    Write-Host ("-" * 80) -ForegroundColor Gray
    Write-Host ""

    # Overall result
    if ($FailedSuites -eq 0) {
        Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
        return 0
    } else {
        Write-Host "$FailedSuites TEST SUITE(S) FAILED!" -ForegroundColor Red
        return 1
    }
}

#===================================================================================================
# Determine Which Tests to Run
#===================================================================================================
$SuitesToRun = @{}

# If no specific flags are set, run all tests
$AnyFlagSet = $TestAuth -or $TestDb -or $TestApi -or $TestSecurity -or $TestClass -or $TestAssignment -or $TestDevices

if (-not $AnyFlagSet) {
    Write-Host "No specific tests selected - running all test suites" -ForegroundColor Cyan
    foreach ($SuiteName in $TestSuites.Keys) {
        $SuitesToRun[$SuiteName] = $TestSuites[$SuiteName]
    }
} else {
    # Run only selected tests
    if ($TestAuth) { $SuitesToRun["Authentication"] = $TestSuites["Authentication"] }
    if ($TestDb) { $SuitesToRun["Database"] = $TestSuites["Database"] }
    if ($TestApi) { $SuitesToRun["API Endpoints"] = $TestSuites["API Endpoints"] }
    if ($TestSecurity) { $SuitesToRun["Security"] = $TestSuites["Security"] }
    if ($TestClass) { $SuitesToRun["Class Management"] = $TestSuites["Class Management"] }
    if ($TestAssignment) { $SuitesToRun["Assignments"] = $TestSuites["Assignments"] }
    if ($TestDevices) { $SuitesToRun["User Devices"] = $TestSuites["User Devices"] }
}

#===================================================================================================
# Display Test Plan
#===================================================================================================
Write-Header "QA TEST SUITE RUNNER"
Write-Host "Base URL: $BaseUrl"
Write-Host "Tests to Run: $($SuitesToRun.Count) suites"
Write-Host "Start Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

Write-Host "Test Suites:" -ForegroundColor Yellow
foreach ($SuiteName in $SuitesToRun.Keys) {
    $Suite = $SuitesToRun[$SuiteName]
    Write-Host "  [ $($Suite.Priority) ] $SuiteName" -NoNewline
    Write-Host " - $($Suite.Description)" -ForegroundColor Gray
}
Write-Host ""

#===================================================================================================
# Check Server
#===================================================================================================
Write-Host "Checking server connectivity..." -ForegroundColor Cyan
try {
    $Response = Invoke-WebRequest -Uri "$BaseUrl/" -Method "GET" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "Server is responding: $($Response.StatusCode)" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Server is not responding at $BaseUrl" -ForegroundColor Red
    Write-Host "Please start the server with: npm run dev" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

#===================================================================================================
# Run Tests
#===================================================================================================
$TestResults = @{}
$OverallStart = Get-Date

foreach ($SuiteName in $SuitesToRun.Keys) {
    $Suite = $SuitesToRun[$SuiteName]
    $ScriptPath = $Suite.Script

    Write-Host "Running: $SuiteName..." -ForegroundColor Cyan

    if (-not (Test-Path $ScriptPath)) {
        Write-Host "  ERROR: Test script not found: $ScriptPath" -ForegroundColor Red
        $TestResults[$SuiteName] = @{
            ExitCode = 1
            Duration = [timespan]::Zero
        }
        if (-not $ContinueOnError) {
            break
        }
        continue
    }

    $SuiteStart = Get-Date

    try {
        $Process = Start-Process -FilePath "pwsh" `
            -ArgumentList "-File", "`"$ScriptPath`"", "-BaseUrl", "`"$BaseUrl`"" `
            -NoNewWindow `
            -Wait `
            -PassThru

        $SuiteEnd = Get-Date
        $SuiteDuration = $SuiteEnd - $SuiteStart

        $TestResults[$SuiteName] = @{
            ExitCode = $Process.ExitCode
            Duration = $SuiteDuration
        }

        Write-SuiteResult -Suite $SuiteName -ExitCode $Process.ExitCode -Duration $SuiteDuration
    }
    catch {
        $SuiteEnd = Get-Date
        $SuiteDuration = $SuiteEnd - $SuiteStart

        $TestResults[$SuiteName] = @{
            ExitCode = 1
            Duration = $SuiteDuration
        }

        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
        Write-SuiteResult -Suite $SuiteName -ExitCode 1 -Duration $SuiteDuration

        if (-not $ContinueOnError) {
            break
        }
    }

    Write-Host ""
}

$OverallEnd = Get-Date
$OverallDuration = $OverallEnd - $OverallStart

#===================================================================================================
# Final Results
#===================================================================================================
$ExitCode = Write-FinalSummary -Results $TestResults -TotalDuration $OverallDuration

exit $ExitCode
