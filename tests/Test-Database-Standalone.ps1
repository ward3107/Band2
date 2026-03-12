#===================================================================================================
# Test-Database-Standalone.ps1
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

function Test-IsNull {
    param($Value)
    if ($null -eq $Value) { return $true }
    if ($Value -is [string] -and [string]::IsNullOrWhiteSpace($Value)) { return $true }
    return $false
}

function Get-EnvVar {
    param([string]$VarName, [string]$Default = $null)

    # Check system environment variable first
    $Value = [System.Environment]::GetEnvironmentVariable($VarName)
    if ($Value -and $Value.Trim() -ne "") {
        return $Value.Trim()
    }

    # Try to find .env file in multiple locations
    $EnvPaths = @(
        if ($PSScriptRoot) { Join-Path $PSScriptRoot "..\.env.local" }
        if ($PSScriptRoot) { Join-Path $PSScriptRoot "..\.env" }
        Join-Path $PWD ".env.local"
        Join-Path $PWD ".env"
        Join-Path $PWD "..\.env.local"
        Join-Path $PWD "..\.env"
    )

    foreach ($EnvPath in $EnvPaths) {
        if ($EnvPath -and (Test-Path $EnvPath)) {
            $content = Get-Content $EnvPath -ErrorAction SilentlyContinue
            if ($content) {
                foreach ($line in $content) {
                    if ($line -match "^$VarName=(.+)$") {
                        $val = $matches[1].Trim()
                        # Remove surrounding quotes if present
                        if ($val -match '^"(.+)"$') {
                            return $matches[1]
                        } elseif ($val -match "^'(.+)'$") {
                            return $matches[1]
                        }
                        return $val
                    }
                }
            }
        }
    }
    return $Default
}

#===================================================================================================
# Configuration
#===================================================================================================
$SupabaseUrl = Get-EnvVar -VarName "NEXT_PUBLIC_SUPABASE_URL"
$SupabaseKey = Get-EnvVar -VarName "NEXT_PUBLIC_SUPABASE_ANON_KEY"

if (Test-IsNull $SupabaseUrl) {
    Write-Host "ERROR: NEXT_PUBLIC_SUPABASE_URL not found" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (Test-IsNull $SupabaseKey) {
    Write-Host "ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY not found" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Title "Database Tests"
Write-Info "Supabase URL: $SupabaseUrl"

#===================================================================================================
# TEST 1: Database Connection
#===================================================================================================
Write-TestHeader "Database Connectivity"

try {
    $Headers = @{
        "apikey" = $SupabaseKey
        "Authorization" = "Bearer $SupabaseKey"
    }
    $Url = "$SupabaseUrl/rest/v1/"
    $Response = Invoke-RestMethod -Uri $Url -Method "GET" -Headers $Headers -TimeoutSec 10

    Write-TestPass "Successfully connected to Supabase"
    $TestResults += @{ Test = "Database Connection"; Status = "PASS"; Message = "Connection established" }
}
catch {
    Write-TestFail "Failed to connect: $($_.Exception.Message)"
    $TestResults += @{ Test = "Database Connection"; Status = "ERROR"; Message = $_.Exception.Message }
}

#===================================================================================================
# TEST 2: Tables Exist
#===================================================================================================
Write-TestHeader "Required Tables Existence"

$RequiredTables = @("profiles", "classes", "assignments", "student_assignment_progress", "student_mode_progress", "class_enrollments", "words", "login_attempts", "user_devices")
$Headers = @{ "apikey" = $SupabaseKey; "Authorization" = "Bearer $SupabaseKey" }
$ExistingTables = 0

foreach ($Table in $RequiredTables) {
    try {
        $Url = "$SupabaseUrl/rest/v1/$Table?limit=1"
        $Response = Invoke-RestMethod -Uri $Url -Method "GET" -Headers $Headers -TimeoutSec 5 -ErrorAction Stop
        Write-Info "  Table '$Table' exists"
        $ExistingTables++
    }
    catch {
        Write-TestFail "Table '$Table' not accessible"
    }
}

if ($ExistingTables -eq $RequiredTables.Count) {
    Write-TestPass "All required tables exist ($ExistingTables/$($RequiredTables.Count))"
    $TestResults += @{ Test = "Table Existence"; Status = "PASS"; Message = "$ExistingTables tables verified" }
} else {
    Write-TestFail "Missing tables: $($RequiredTables.Count - $ExistingTables)"
    $TestResults += @{ Test = "Table Existence"; Status = "FAIL"; Message = "$ExistingTables/$($RequiredTables.Count) found" }
}

#===================================================================================================
# TEST 3: Profiles Schema
#===================================================================================================
Write-TestHeader "Profiles Table Schema"

$RequiredColumns = @("id", "email", "full_name", "role", "avatar_url", "created_at", "last_login", "is_admin", "failed_login_attempts", "locked_until")
$Headers = @{ "apikey" = $SupabaseKey; "Authorization" = "Bearer $SupabaseKey"; "Prefer" = "plurality=singular" }

try {
    $Url = "$SupabaseUrl/rest/v1/profiles?select=*&limit=1"
    $Response = Invoke-RestMethod -Uri $Url -Method "GET" -Headers $Headers -TimeoutSec 10

    if ($Response -and $Response.PSObject.Properties.Name.Count -gt 0) {
        $FoundColumns = $Response.PSObject.Properties.Name
        $MissingColumns = $RequiredColumns | Where-Object { $_ -notin $FoundColumns }

        if ($MissingColumns.Count -eq 0) {
            Write-TestPass "All required columns present"
            $TestResults += @{ Test = "Profiles Schema"; Status = "PASS"; Message = "All columns verified" }
        } else {
            Write-TestFail "Missing columns: $($MissingColumns -join ', ')"
            $TestResults += @{ Test = "Profiles Schema"; Status = "FAIL"; Message = "Missing: $($MissingColumns -join ', ')" }
        }
    } else {
        Write-TestPass "Profiles table accessible (empty)"
        $TestResults += @{ Test = "Profiles Schema"; Status = "PASS"; Message = "Table accessible" }
    }
}
catch {
    Write-TestFail "Failed to query profiles: $($_.Exception.Message)"
    $TestResults += @{ Test = "Profiles Schema"; Status = "ERROR"; Message = $_.Exception.Message }
}

#===================================================================================================
# TEST 4: Classes CRUD
#===================================================================================================
Write-TestHeader "Classes CRUD Operations"

$Headers = @{ "apikey" = $SupabaseKey; "Authorization" = "Bearer $SupabaseKey"; "Content-Type" = "application/json"; "Prefer" = "return=representation" }

try {
    $TeacherUrl = "$SupabaseUrl/rest/v1/profiles?select=id&role=eq.teacher&limit=1"
    $TeacherResponse = Invoke-RestMethod -Uri $TeacherUrl -Method "GET" -Headers $Headers -TimeoutSec 10

    if (-not $TeacherResponse -or $TeacherResponse.Count -eq 0) {
        Write-WarningMessage "No teacher profiles found - skipping CRUD test"
        $TestResults += @{ Test = "Classes CRUD"; Status = "SKIP"; Message = "No teacher profile" }
    } else {
        $TeacherId = $TeacherResponse[0].id
        Write-Info "  Using teacher ID: $TeacherId"

        # CREATE
        $ClassName = "Test Class $(Get-Date -Format 'yyyyMMddHHmmss')"
        $ClassCode = -join ((48..57) + (65..90) | Get-Random -Count 6 | ForEach-Object { [char]$_ })
        $CreateBody = @{ teacher_id = $TeacherId; name = $ClassName; grade_level = "10"; class_code = $ClassCode } | ConvertTo-Json
        $CreateResponse = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/classes" -Method "POST" -Headers $Headers -Body $CreateBody -TimeoutSec 10

        if ($CreateResponse -and $CreateResponse.Count -gt 0) {
            $CreatedClassId = $CreateResponse[0].id
            Write-TestPass "CREATE: Class created with ID: $CreatedClassId"

            # READ
            $ReadResponse = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/classes?id=eq.$CreatedClassId" -Method "GET" -Headers $Headers -TimeoutSec 10
            if ($ReadResponse -and $ReadResponse.Count -gt 0) {
                Write-TestPass "READ: Class retrieved"

                # UPDATE
                $UpdateBody = @{ name = "$ClassName (Updated)" } | ConvertTo-Json
                $UpdateResponse = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/classes?id=eq.$CreatedClassId" -Method "PATCH" -Headers $Headers -Body $UpdateBody -TimeoutSec 10
                Write-TestPass "UPDATE: Class updated"

                # DELETE
                Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/classes?id=eq.$CreatedClassId" -Method "DELETE" -Headers $Headers -TimeoutSec 10 | Out-Null
                Write-TestPass "DELETE: Class deleted"

                $TestResults += @{ Test = "Classes CRUD"; Status = "PASS"; Message = "All CRUD successful" }
            } else {
                $TestResults += @{ Test = "Classes CRUD"; Status = "FAIL"; Message = "READ failed" }
            }
        } else {
            $TestResults += @{ Test = "Classes CRUD"; Status = "FAIL"; Message = "CREATE failed" }
        }
    }
}
catch {
    Write-TestFail "Exception: $($_.Exception.Message)"
    $TestResults += @{ Test = "Classes CRUD"; Status = "ERROR"; Message = $_.Exception.Message }
}

#===================================================================================================
# TEST 5: Foreign Key Constraints
#===================================================================================================
Write-TestHeader "Foreign Key Constraints"

$Headers = @{ "apikey" = $SupabaseKey; "Authorization" = "Bearer $SupabaseKey"; "Content-Type" = "application/json" }

try {
    $FakeTeacherId = [guid]::NewGuid().ToString()
    $InvalidClass = @{ teacher_id = $FakeTeacherId; name = "Invalid Class"; class_code = "INVALID" } | ConvertTo-Json

    try {
        $Response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/classes" -Method "POST" -Headers $Headers -Body $InvalidClass -TimeoutSec 10 -ErrorAction Stop
        Write-TestFail "Foreign key NOT enforced"
        $TestResults += @{ Test = "Foreign Key"; Status = "FAIL"; Message = "FK not enforced" }
    }
    catch {
        Write-TestPass "Foreign key enforced"
        $TestResults += @{ Test = "Foreign Key"; Status = "PASS"; Message = "FK constraints working" }
    }
}
catch {
    Write-TestFail "Exception: $($_.Exception.Message)"
    $TestResults += @{ Test = "Foreign Key"; Status = "ERROR"; Message = $_.Exception.Message }
}

#===================================================================================================
# TEST 6: Assignment Structure
#===================================================================================================
Write-TestHeader "Assignment Table Structure"

$Headers = @{ "apikey" = $SupabaseKey; "Authorization" = "Bearer $SupabaseKey" }

try {
    $Url = "$SupabaseUrl/rest/v1/assignments?select=*&limit=1"
    $Response = Invoke-RestMethod -Uri $Url -Method "GET" -Headers $Headers -TimeoutSec 10

    $ExpectedFields = @("id", "teacher_id", "title", "description", "word_ids", "total_words", "deadline", "assignment_type", "created_at", "updated_at")

    if ($Response.Count -gt 0) {
        $ActualFields = $Response[0].PSObject.Properties.Name
        $Missing = $ExpectedFields | Where-Object { $_ -notin $ActualFields }

        if ($Missing.Count -eq 0) {
            Write-TestPass "Assignment structure validated"
            $TestResults += @{ Test = "Assignment Structure"; Status = "PASS"; Message = "All fields present" }
        } else {
            Write-TestFail "Missing fields: $($Missing -join ', ')"
            $TestResults += @{ Test = "Assignment Structure"; Status = "FAIL"; Message = "Missing: $($Missing -join ', ')" }
        }
    } else {
        Write-Info "  No assignments found - table accessible but empty"
        $TestResults += @{ Test = "Assignment Structure"; Status = "PASS"; Message = "Table accessible (empty)" }
    }
}
catch {
    Write-TestFail "Failed: $($_.Exception.Message)"
    $TestResults += @{ Test = "Assignment Structure"; Status = "ERROR"; Message = $_.Exception.Message }
}

#===================================================================================================
# RESULTS SUMMARY
#===================================================================================================
Write-Title "Test Results Summary"

$Passed = ($TestResults | Where-Object { $_.Status -eq "PASS" }).Count
$Failed = ($TestResults | Where-Object { $_.Status -eq "FAIL" }).Count
$Errors = ($TestResults | Where-Object { $_.Status -eq "ERROR" }).Count
$Skipped = ($TestResults | Where-Object { $_.Status -eq "SKIP" }).Count
$Total = $TestResults.Count

foreach ($Result in $TestResults) {
    $StatusColor = switch ($Result.Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "WARN" { "Yellow" }
        "ERROR" { "Magenta" }
        "SKIP" { "Cyan" }
        default { "White" }
    }
    Write-Host "  [$($Result.Status)] " -ForegroundColor $StatusColor -NoNewline
    Write-Host "$($Result.Test): $($Result.Message)"
}

Write-Host ""
Write-Host "Total Tests: $Total | Passed: $Passed | Failed: $Failed | Errors: $Errors | Skipped: $Skipped"
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tests Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Read-Host "Press Enter to exit"
