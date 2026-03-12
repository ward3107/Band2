# QA Test Suite for Band2 Vocab App

A comprehensive PowerShell-based test suite for the Band2 vocabulary learning application.

## Overview

This test suite provides modular, focused testing for each major feature area of the application. Each test script can be run independently or as part of the full test suite.

## Prerequisites

- PowerShell 7.0 or higher
- Application server running (typically on `http://localhost:3000`)
- Environment variables configured in `.env` file

## Quick Start

```powershell
# Run all tests
.\Run-AllTests.ps1

# Run specific test suites
.\Run-AllTests.ps1 -TestAuth      # Authentication tests only
.\Run-AllTests.ps1 -TestDb        # Database tests only
.\Run-AllTests.ps1 -TestSecurity  # Security tests only

# Test against different environment
.\Run-AllTests.ps1 -BaseUrl "https://staging.example.com"
```

## Test Modules

### 1. Test-Authentication.ps1

Tests the authentication system including:

- Password-based login for teachers, students, and admins
- Account lockout after failed attempts
- Session management and multi-role support
- Google OAuth flow
- Logout functionality

**Run:** `.\Test-Authentication.ps1`

### 2. Test-Database.ps1

Tests Supabase database operations:

- Connection and table existence
- CRUD operations on all tables
- Foreign key constraints
- Null value handling
- Data integrity checks

**Run:** `.\Test-Database.ps1`

### 3. Test-APIEndpoints.ps1

Tests all API endpoints:

- Admin routes (validate-email, verify-password, setup-profile)
- Student routes (login, join class)
- Teacher routes (login, class management)
- HTTP status codes
- CORS headers
- Error message clarity

**Run:** `.\Test-APIEndpoints.ps1`

### 4. Test-Security.ps1

Tests security features:

- CSRF token generation
- Rate limiting on login
- SQL injection prevention
- XSS prevention
- IP whitelist configuration
- CAPTCHA integration
- Session security headers

**Run:** `.\Test-Security.ps1`

### 5. Test-ClassManagement.ps1

Tests class management features:

- Creating classes with valid/invalid data
- Class code format validation
- Student join functionality
- Duplicate enrollment prevention
- Teacher class listing
- Student viewing and removal

**Run:** `.\Test-ClassManagement.ps1`

### 6. Test-Assignments.ps1

Tests assignment functionality:

- Creating assignments with words
- Assignment type validation (flashcards, quiz, both)
- Deadline validation
- Word list handling (JSON arrays)
- Student progress tracking
- Quiz score recording
- Custom words support

**Run:** `.\Test-Assignments.ps1`

### 7. Test-UserDevices.ps1

Tests device tracking and security:

- Device fingerprint generation
- Device recording on login
- New device detection
- Login history tracking
- IP and user agent logging
- Privacy protection (code truncation)

**Run:** `.\Test-UserDevices.ps1`

## Helper Module

### TestHelpers.ps1

Shared functions used by all test scripts:

- `Invoke-ApiCall`: Makes HTTP requests with error handling
- `Test-ServerAlive`: Checks if application is running
- `Write-TestHeader`, `Write-TestPass`, `Write-TestFail`: Logging functions
- `New-RandomEmail`, `New-RandomPassword`: Test data generators

## Test Results

Each test script outputs:

1. **Console output**: Color-coded results (Green=Pass, Red=Fail, Yellow=Warn)
2. **Summary table**: Pass/Fail/Error counts
3. **Exit code**: 0 for all pass, 1 for any failure

Example output:
```
========================================
  Test Results Summary
========================================

  [PASS] Teacher Login: Login successful
  [PASS] Student Login: Login successful
  [FAIL] Account Lockout: Not locked after 5 attempts

Total Tests: 8 | Passed: 7 | Failed: 1 | Errors: 0
```

## Environment Variables

Required in `.env` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin (optional)
ADMIN_EMAIL=admin@example.com

# Security (optional)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
ADMIN_IP_WHITELIST=
```

## Common Issues

### Server Not Running

```
ERROR: Server is not running at http://localhost:3000
```
**Solution:** Start the dev server: `npm run dev`

### Missing Environment Variables

```
ERROR: NEXT_PUBLIC_SUPABASE_URL not found in environment
```
**Solution:** Copy `.env.example` to `.env` and fill in values

### PowerShell Version

```
#Requires -Version 7.0
```
**Solution:** Install PowerShell 7+ from https://github.com/PowerShell/PowerShell

## Writing New Tests

To add a new test module:

1. Create a new `.ps1` file in the `tests/` directory
2. Import the helpers: `. .\TestHelpers.ps1`
3. Add the script to `Run-AllTests.ps1` in the `$TestSuites` hashtable
4. Follow the naming convention: `Test-FeatureName.ps1`

Template:
```powershell
using module .\TestHelpers.psm1
#Requires -Version 7.0

param(
    [string]$BaseUrl = "http://localhost:3000",
    [switch]$VerboseOutput = $false
)

. .\TestHelpers.ps1

$ErrorActionPreference = "Stop"
$TestResults = @()

function Test-YourFeature {
    Write-TestHeader "Your Feature Name"

    try {
        # Your test logic here
        Write-TestPass "Feature works correctly"
        $TestResults += @{ Test = "Your Feature"; Status = "PASS"; Message = "Working" }
    }
    catch {
        Write-TestFail "Exception: $($_.Exception.Message)"
        $TestResults += @{ Test = "Your Feature"; Status = "ERROR"; Message = $_.Exception.Message }
    }
}

# Run tests
Test-YourFeature

# Results
Write-Title "Test Results Summary"
# ... summary code ...
```

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Tests
  shell: pwsh
  run: |
    npm run dev &
    Start-Sleep -Seconds 10
    .\tests\Run-AllTests.ps1
```

## Support

For issues or questions:

1. Check the test output for specific error messages
2. Verify environment variables are set correctly
3. Ensure the application server is running
4. Review the feature implementation in `src/`
