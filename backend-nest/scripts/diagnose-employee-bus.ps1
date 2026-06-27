# PowerShell script to diagnose employee bus subscription
# Usage: .\scripts\diagnose-employee-bus.ps1 <employeeId>

param(
    [Parameter(Mandatory=$true)]
    [string]$EmployeeId
)

Write-Host " Diagnosing employee bus subscription..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Employee ID: $EmployeeId" -ForegroundColor Yellow
Write-Host ""
Write-Host "=" * 60

# Check if backend is running
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/employees/$EmployeeId" -Method Get -ErrorAction Stop
    Write-Host "`n✅ Employee Found:" -ForegroundColor Green
    Write-Host "   Name: $($response.name)" -ForegroundColor White
    Write-Host "   Status: $($response.status)" -ForegroundColor White
} catch {
    Write-Host "`n❌ Employee not found or backend not running!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=" * 60

# Get all active subscribers
try {
    $subscribers = Invoke-RestMethod -Uri "http://localhost:3000/api/transportation/active-subscribers" -Method Get -ErrorAction Stop
    
    Write-Host "`n🚌 Active Subscribers:" -ForegroundColor Cyan
    
    if ($subscribers.PSObject.Properties.Count -eq 0) {
        Write-Host "   No active subscribers found" -ForegroundColor Gray
    } else {
        foreach ($empId in $subscribers.PSObject.Properties.Name) {
            $info = $subscribers.$empId
            $isCurrentEmployee = ($empId -eq $EmployeeId)
            
            if ($isCurrentEmployee) {
                Write-Host "`n   🚨 $empId (THIS EMPLOYEE)" -ForegroundColor Red
                Write-Host "      Route: $($info.route)" -ForegroundColor Red
                Write-Host "      Plate: $($info.plateNumber)" -ForegroundColor Red
                Write-Host ""
                Write-Host "   ⚠️  BLOCKING: Employee is subscribed to this bus!" -ForegroundColor Red
            } else {
                Write-Host "   ✓ $empId - $($info.route) ($($info.plateNumber))" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "`n⚠️  Could not fetch active subscribers: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=" * 60

# Get all buses
try {
    $buses = Invoke-RestMethod -Uri "http://localhost:3000/api/transportation/buses" -Method Get -ErrorAction Stop
    
    Write-Host "`n🚌 Available Buses:" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($bus in $buses) {
        $passengerCount = @($bus.passengers).Count
        $isSubscribed = $bus.passengers | Where-Object { $_.employeeId -eq $EmployeeId }
        $available = $bus.capacity - $passengerCount
        
        Write-Host "   [$($bus.route)] ($($bus.plateNumber))" -ForegroundColor White
        Write-Host "      Capacity: $passengerCount/$($bus.capacity) ($available available)" -ForegroundColor Gray
        
        if ($isSubscribed) {
            Write-Host "      🔴 ALREADY SUBSCRIBED" -ForegroundColor Red
        } elseif ($available -le 0) {
            Write-Host "      🔴 BUS IS FULL" -ForegroundColor Red
        } else {
            Write-Host "      ✅ AVAILABLE" -ForegroundColor Green
        }
        Write-Host ""
    }
} catch {
    Write-Host "`n⚠️  Could not fetch buses: $_" -ForegroundColor Yellow
}

Write-Host "=" * 60
Write-Host "`n📝 RECOMMENDED ACTIONS:" -ForegroundColor Cyan
Write-Host ""

# Check if employee is subscribed
if ($subscribers.PSObject.Properties.Name -contains $EmployeeId) {
    $currentBus = $subscribers.$EmployeeId
    Write-Host "Step 1: Remove employee from current bus" -ForegroundColor Yellow
    Write-Host "   Invoke-RestMethod -Uri 'http://localhost:3000/api/transportation/buses/<busId>/passengers/$EmployeeId' -Method Delete" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Step 2: Add employee to target bus" -ForegroundColor Yellow
    Write-Host "   Invoke-RestMethod -Uri 'http://localhost:3000/api/transportation/buses/<targetBusId>/passengers' -Method Post -Body '{`"employeeId`": `"$EmployeeId`", `"subscriptionDate`": `"$(Get-Date -Format 'yyyy-MM-dd')`"}' -ContentType 'application/json'" -ForegroundColor Gray
} else {
    Write-Host "✅ Employee is not subscribed to any bus." -ForegroundColor Green
    Write-Host "   You can add them directly:" -ForegroundColor White
    Write-Host "   Invoke-RestMethod -Uri 'http://localhost:3000/api/transportation/buses/<targetBusId>/passengers' -Method Post -Body '{`"employeeId`": `"$EmployeeId`", `"subscriptionDate`": `"$(Get-Date -Format 'yyyy-MM-dd')`"}' -ContentType 'application/json'" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=" * 60
Write-Host ""
Write-Host "💡 TIP: For automated reassignment, use:" -ForegroundColor Cyan
Write-Host "   node scripts/reassign-employee-bus.js $EmployeeId <targetBusId>" -ForegroundColor Gray
Write-Host ""
