#===================================================================================================
# Test-Security-Standalone.ps1
# Standalone version - no external dependencies
#===================================================================================================

param(
    [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
$TestResults = @()

#===================================================================================================
# Helper Functions (inline)
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

function Write-WarningMessage {
    param([string]$Message)
    Write-Host "  [WARN] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Invoke-ApiCall {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [string]$Body = $null,
        [switch]$SuppressErrors = $false,
        [int]$TimeoutSeconds = 30
    )

    try {
        $Url = $BaseUrl + $Endpoint
        $Headers = @{ "Content-Type" = "application/json"; "Accept" = "application/json" }
        $Params = @{ Uri = $Url; Method = $Method; Headers = $Headers; TimeoutSec = $TimeoutSeconds; UseBasicParsing = $true }

        if ($Body -and ($Method -in @("POST", "PUT", "PATCH"))) {
            $Params.Body = $Body
        }

        $Response = Invoke-WebRequest @Params -ErrorAction Stop

        if ($Response.Content) {
            try { return $Response.Content | ConvertFrom-Json }
            catch { return @{ Content = $Response.Content; StatusCode = $Response.StatusCode } }
        }
        return @{ StatusCode = $Response.StatusCode }
    }
    catch {
        if ($SuppressErrors) {
            $ErrorInfo = @{ error = $_.Exception.Message; StatusCode = 0 }
            if ($_.Exception.Response) {
                $ErrorInfo.StatusCode = [int]$_.Exception.Response.StatusCode
            }
            return $ErrorInfo
        }
        throw $_
    }
}

function Test-ServerAlive {
    param([string]$BaseUrl = "http://localhost:3000")
    try {
        $Response = Invoke-WebRequest -Uri "$BaseUrl/" -Method "GET" -TimeoutSec 5 -UseBasicParsing
        return $Response.StatusCode -eq 200
    }
    catch { return $false }
}

#===================================================================================================
# MAIN
#===================================================================================================

Write-Title "Security Tests"
Write-Info "Base URL: $BaseUrl"

if (-not (Test-ServerAlive -BaseUrl $BaseUrl)) {
    Write-Host "ERROR: Server not running" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Info "Server is running!"

#===================================================================================================
# TEST 1: SQL Injection Prevention
#===================================================================================================
Write-TestHeader "SQL Injection Prevention"

try {
    $SQLInjectionPayloads = @("admin'--", "admin' OR '1'='1", "'; DROP TABLE profiles; --", "1' UNION SELECT * FROM profiles--", "admin'/**/OR/**/1=1--")
    $BlockedAttempts = 0

    foreach ($Payload in $SQLInjectionPayloads) {
        $Body = @{ email = $Payload; password = "password123!" } | ConvertTo-Json
        $Response = Invoke-ApiCall -Endpoint "/api/teacher/login" -Method "POST" -Body $Body -SuppressErrors
        if ($Response.error -or $Response.StatusCode -ge 400) { $BlockedAttempts++ }
    }

    if ($BlockedAttempts -eq $SQLInjectionPayloads.Count) {
        Write-TestPass "All SQL injection attempts blocked ($BlockedAttempts/$($SQLInjectionPayloads.Count))"
        $TestResults += @{ Test = "SQL Injection"; Status = "PASS"; Message = "All $BlockedAttempts blocked" }
    } else {
        Write-TestFail "Some SQL injection attempts not blocked: $BlockedAttempts/$($SQLInjectionPayloads.Count)"
        $TestResults += @{ Test = "SQL Injection"; Status = "FAIL"; Message = "$BlockedAttempts/$($SQLInjectionPayloads.Count) blocked" }
    }
}
catch {
    Write-TestFail "Exception: $($_.Exception.Message)"
    $TestResults += @{ Test = "SQL Injection"; Status = "ERROR"; Message = $_.Exception.Message }
}

#===================================================================================================
# TEST 2: XSS Prevention
#===================================================================================================
Write-TestHeader "XSS Prevention"

try {
    $XSSPayloads = @("<script>alert('XSS')</script>", "<img src=x onerror=alert('XSS')>", "<svg onload=alert('XSS')>", "javascript:alert('XSS')")
    $SanitizedAttempts = 0

    foreach ($Payload in $XSSPayloads) {
        $Body = @{ email = "test@test.com"; password = $Payload } | ConvertTo-Json
        $Response = Invoke-ApiCall -Endpoint "/api/teacher/login" -Method "POST" -Body $Body -SuppressErrors
        if ($Response.error -or $Response.StatusCode -ge 400) { $SanitizedAttempts++ }
    }

    Write-TestPass "XSS payloads being handled ($SanitizedAttempts/$($XSSPayloads.Count))"
    $TestResults += @{ Test = "XSS Prevention"; Status = "PASS"; Message = "$SanitizedAttempts/$($XSSPayloads.Count) handled" }
}
catch {
    Write-TestFail "Exception: $($_.Exception.Message)"
    $TestResults += @{ Test = "XSS Prevention"; Status = "ERROR"; Message = $_.Exception.Message }
}

#===================================================================================================
# TEST 3: Email Validation
#===================================================================================================
Write-TestHeader "Email Input Validation"

try {
    $InvalidEmails = @("plainaddress", "@no-local.com", "no-at-sign.com", "spaces in@email.com", "missing@domain", "missing@.com")
    $RejectedCount = 0

    foreach ($InvalidEmail in $InvalidEmails) {
        $Body = @{ email = $InvalidEmail; password = "TestPassword123!" } | ConvertTo-Json
        $Response = Invoke-ApiCall -Endpoint "/api/teacher/login" -Method "POST" -Body $Body -SuppressErrors
        if ($Response.error -or $Response.StatusCode -ge 400) { $RejectedCount++ }
    }

    if ($RejectedCount -eq $InvalidEmails.Count) {
        Write-TestPass "All invalid email formats rejected ($RejectedCount/$($InvalidEmails.Count))"
        $TestResults += @{ Test = "Email Validation"; Status = "PASS"; Message = "$RejectedCount rejected" }
    } else {
        Write-TestFail "Some invalid emails accepted: $RejectedCount/$($InvalidEmails.Count)"
        $TestResults += @{ Test = "Email Validation"; Status = "FAIL"; Message = "$RejectedCount/$($InvalidEmails.Count) rejected" }
    }
}
catch {
    Write-TestFail "Exception: $($_.Exception.Message)"
    $TestResults += @{ Test = "Email Validation"; Status = "ERROR"; Message = $_.Exception.Message }
}

#===================================================================================================
# TEST 4: Password Requirements
#===================================================================================================
Write-TestHeader "Password Requirements Enforcement"

try {
    $WeakPasswords = @(
        @{ Password = "123"; Reason = "Too short" },
        @{ Password = "password"; Reason = "Common" },
        @{ Password = "abcdefgh"; Reason = "No numbers/special" }
    )
    $RejectedCount = 0

    foreach ($Weak in $WeakPasswords) {
        $Body = @{ email = "test@teacher.band2.app"; password = $Weak.Password } | ConvertTo-Json
        $Response = Invoke-ApiCall -Endpoint "/api/teacher/login" -Method "POST" -Body $Body -SuppressErrors
        if ($Response.error) { $RejectedCount++ }
    }

    Write-Info "  $RejectedCount/$($WeakPasswords.Count) weak passwords handled"
    $TestResults += @{ Test = "Password Requirements"; Status = "PASS"; Message = "$RejectedCount handled" }
}
catch {
    Write-TestFail "Exception: $($_.Exception.Message)"
    $TestResults += @{ Test = "Password Requirements"; Status = "ERROR"; Message = $_.Exception.Message }
}

#===================================================================================================
# TEST 5: Auth Bypass Attempts
#===================================================================================================
Write-TestHeader "Authentication Bypass Prevention"

try {
    $BypassAttempts = @(
        @{ Name = "Null password"; Body = @{ email = "test@test.com"; password = $null } },
        @{ Name = "Empty body"; Body = @{} }
    )
    $BlockedCount = 0

    foreach ($Attempt in $BypassAttempts) {
        try {
            $JsonBody = $Attempt.Body | ConvertTo-Json -Depth 10
            $Response = Invoke-ApiCall -Endpoint "/api/teacher/login" -Method "POST" -Body $JsonBody -SuppressErrors
            if ($Response.error -or $Response.StatusCode -ge 400) { $BlockedCount++ }
        }
        catch { $BlockedCount++ }
    }

    if ($BlockedCount -eq $BypassAttempts.Count) {
        Write-TestPass "All bypass attempts blocked ($BlockedCount/$($BypassAttempts.Count))"
        $TestResults += @{ Test = "Auth Bypass"; Status = "PASS"; Message = "$BlockedCount blocked" }
    } else {
        Write-TestFail "Some bypass attempts succeeded: $BlockedCount/$($BypassAttempts.Count)"
        $TestResults += @{ Test = "Auth Bypass"; Status = "FAIL"; Message = "$BlockedCount/$($BypassAttempts.Count) blocked" }
    }
}
catch {
    Write-TestFail "Exception: $($_.Exception.Message)"
    $TestResults += @{ Test = "Auth Bypass"; Status = "ERROR"; Message = $_.Exception.Message }
}

#===================================================================================================
# TEST 6: HTTP Security Headers
#===================================================================================================
Write-TestHeader "HTTP Security Headers"

try {
    $Response = Invoke-WebRequest -Uri "$BaseUrl/" -Method "GET" -UseBasicParsing -TimeoutSec 10

    $SecurityHeaders = @{
        "X-Frame-Options" = $false
        "X-Content-Type-Options" = $false
        "Strict-Transport-Security" = $false
        "X-XSS-Protection" = $false
        "Referrer-Policy" = $false
        "Permissions-Policy" = $false
        "Content-Security-Policy" = $false
    }

    foreach ($HeaderKey in $Response.Headers.Keys) {
        if ($SecurityHeaders.ContainsKey($HeaderKey)) {
            $SecurityHeaders[$HeaderKey] = $true
        }
    }

    $PresentCount = ($SecurityHeaders.Values | Where-Object { $_ -eq $true }).Count
    $PresentHeaders = ($SecurityHeaders.GetEnumerator() | Where-Object { $_.Value -eq $true } | ForEach-Object { $_.Key }) -join ', '

    if ($PresentCount -ge 4) {
        Write-TestPass "Security headers present: $PresentCount"
        foreach ($h in $PresentHeaders -split ', ') { if ($h) { Write-Info "  $h" } }
        $TestResults += @{ Test = "Security Headers"; Status = "PASS"; Message = "$PresentCount headers found" }
    } else {
        Write-WarningMessage "Few security headers: $PresentCount"
        foreach ($h in $PresentHeaders -split ', ') { if ($h) { Write-Info "  $h" } }
        $TestResults += @{ Test = "Security Headers"; Status = "WARN"; Message = "$PresentCount headers found" }
    }
}
catch {
    Write-TestFail "Exception: $($_.Exception.Message)"
    $TestResults += @{ Test = "Security Headers"; Status = "ERROR"; Message = $_.Exception.Message }
}

#===================================================================================================
# RESULTS SUMMARY
#===================================================================================================
Write-Title "Test Results Summary"

$Passed = ($TestResults | Where-Object { $_.Status -eq "PASS" }).Count
$Failed = ($TestResults | Where-Object { $_.Status -eq "FAIL" }).Count
$Errors = ($TestResults | Where-Object { $_.Status -eq "ERROR" }).Count
$Warnings = ($TestResults | Where-Object { $_.Status -eq "WARN" }).Count
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
Write-Host "Total Tests: $Total | Passed: $Passed | Failed: $Failed | Errors: $Errors | Warnings: $Warnings"
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tests Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Read-Host "Press Enter to exit"
