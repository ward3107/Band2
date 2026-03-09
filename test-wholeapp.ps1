# ===== VOCABAND WHOLE-APP LOAD TEST =====
$pages = @(
    "https://vocaband.com/",
    "https://vocaband.com/join",
    "https://vocaband.com/auth/callback",
    "https://vocaband.com/student",
    "https://vocaband.com/student/join-class",
    "https://vocaband.com/student/assignments/123",
    "https://vocaband.com/teacher/login",
    "https://vocaband.com/teacher/dashboard",
    "https://vocaband.com/admin/login",
    "https://vocaband.com/test-auth"
)
$totalUsers = 300
$requestsPerUser = 3
$results = @()
Write-Host "🚀 Starting WHOLE-APP load test" -ForegroundColor Cyan
Write-Host "👥 Users: $totalUsers | Pages per user: $requestsPerUser" -ForegroundColor Yellow
$stats = @{}
for ($user = 1; $user -le $totalUsers; $user++) {
    for ($i = 1; $i -le $requestsPerUser; $i++) {
        if ((Get-Random) -lt 0.7) { $url = Get-Random -InputObject $pages[0..2] }
        else { $url = Get-Random -InputObject $pages }
        try {
            $start = Get-Date
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30 -MaximumRedirection 5
            $duration = ((Get-Date) - $start).TotalMilliseconds
            $pageKey = $url -replace 'https://vocaband.com', ''
            if (-not $stats[$pageKey]) { $stats[$pageKey] = @{Success=0; Fail=0; Times=@()} }
            if ($response.StatusCode -eq 200) { $stats[$pageKey].Success++ } else { $stats[$pageKey].Fail++ }
            $stats[$pageKey].Times += $duration
            $results += [PSCustomObject]@{ User=$user; Page=$pageKey; Status=$response.StatusCode; TimeMs=[math]::Round($duration,2); Success=($response.StatusCode -eq 200) }
        }
        catch {
            $pageKey = $url -replace 'https://vocaband.com', ''
            if (-not $stats[$pageKey]) { $stats[$pageKey] = @{Success=0; Fail=0; Times=@()} }
            $stats[$pageKey].Fail++
            $results += [PSCustomObject]@{ User=$user; Page=$pageKey; Status="Error"; TimeMs=0; Success=$false }
        }
    }
    if ($user % 50 -eq 0) { Write-Host "✓ Completed $user users..." -ForegroundColor Green }
    Start-Sleep -Milliseconds (Get-Random -Min 100 -Max 500)
}
Write-Host ""
Write-Host "📊 RESULTS" -ForegroundColor Cyan
$totalRequests = $results.Count
$successful = ($results | Where-Object {$_.Success}).Count
Write-Host "Total requests: $totalRequests"
Write-Host "✅ HTTP 200: $successful"
Write-Host "⚠️ Other codes: $($totalRequests - $successful)"
if ($successful -gt 0) {
    $avg = [math]::Round(($results | Where-Object {$_.Success} | Measure-Object -Property TimeMs -Average).Average, 2)
    Write-Host "⏱️ Average time: $avg ms"
}
Write-Host "✅ Test complete!" -ForegroundColor Green