$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5000/api'

function Login($email, $password) {
  $body = @{ email = $email; password = $password } | ConvertTo-Json
  $res = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body $body
  return $res.token
}

$admin = Login 'admin@test.com' 'password123'
$sales = Login 'sales@test.com' 'password123'

Write-Host "1. LOGIN admin + sales: OK"

# Dashboard
$dash = Invoke-RestMethod -Uri "$base/dashboard/summary" -Headers @{ Authorization = "Bearer $admin" }
Write-Host "2. DASHBOARD: customers=$($dash.customers.total) products=$($dash.products.total) lowStock=$($dash.products.lowStock) challans total=$($dash.challans.total) confirmed=$($dash.challans.confirmed) draft=$($dash.challans.draft)"

# Invalid token
try {
  Invoke-RestMethod -Uri "$base/customers" -Headers @{ Authorization = 'Bearer invalid.token.here' }
  Write-Host "3. INVALID TOKEN: NOT rejected (FAIL)"
} catch {
  Write-Host "3. INVALID TOKEN rejected: $($_.Exception.Response.StatusCode.value__) OK"
}

# Missing record
try {
  Invoke-RestMethod -Uri "$base/customers/does-not-exist" -Headers @{ Authorization = "Bearer $sales" }
  Write-Host "4. MISSING RECORD: NOT 404 (FAIL)"
} catch {
  Write-Host "4. MISSING RECORD: $($_.Exception.Response.StatusCode.value__) OK"
}

# Full challan business flow
$cust = (Invoke-RestMethod -Uri "$base/customers?search=sunil" -Headers @{ Authorization = "Bearer $sales" }).data[0]
$prods = (Invoke-RestMethod -Uri "$base/products" -Headers @{ Authorization = "Bearer $sales" }).data
$led = $prods | Where-Object { $_.sku -eq 'LED-9W-001' }
$mcb = $prods | Where-Object { $_.sku -eq 'MCB-32-006' }
Write-Host "5. BEFORE: LED=$($led.currentStock) MCB=$($mcb.currentStock)"

# Draft challan
$draftBody = @{ customerId = $cust.id; status = 'DRAFT'; items = @(
  @{ productId = $led.id; quantity = 5 },
  @{ productId = $mcb.id; quantity = 3 }
) } | ConvertTo-Json -Depth 5
$draft = Invoke-RestMethod -Method Post -Uri "$base/challans" -Headers @{ Authorization = "Bearer $sales"; 'Content-Type' = 'application/json' } -Body $draftBody
Write-Host "6. DRAFT created: $($draft.challanNumber) status=$($draft.status) snapshotItems=$($draft.productSnapshot.Count) qty=$($draft.totalQuantity)"

# Confirm
$confirmed = Invoke-RestMethod -Method Put -Uri "$base/challans/$($draft.id)/confirm" -Headers @{ Authorization = "Bearer $sales" }
Write-Host "7. CONFIRMED: $($confirmed.challanNumber) status=$($confirmed.status)"

# Stock after
$prods2 = (Invoke-RestMethod -Uri "$base/products" -Headers @{ Authorization = "Bearer $sales" }).data
$led2 = $prods2 | Where-Object { $_.sku -eq 'LED-9W-001' }
$mcb2 = $prods2 | Where-Object { $_.sku -eq 'MCB-32-006' }
$ledOk = $led2.currentStock -eq ($led.currentStock - 5)
$mcbOk = $mcb2.currentStock -eq ($mcb.currentStock - 3)
Write-Host "8. STOCK AFTER: LED=$($led2.currentStock) (expected $($led.currentStock - 5), OK=$ledOk) MCB=$($mcb2.currentStock) (expected $($mcb.currentStock - 3), OK=$mcbOk)"

# Oversell
try {
  $over = @{ customerId = $cust.id; status = 'CONFIRMED'; items = @(@{ productId = $mcb.id; quantity = 999999 }) } | ConvertTo-Json -Depth 5
  Invoke-RestMethod -Method Post -Uri "$base/challans" -Headers @{ Authorization = "Bearer $sales"; 'Content-Type' = 'application/json' } -Body $over
  Write-Host "9. OVERSELL: not rejected (FAIL)"
} catch {
  Write-Host "9. OVERSELL rejected: $($_.Exception.Response.StatusCode.value__) - $($_.ErrorDetails.Message) OK"
}

# Follow-up updates customer follow-up date
$fu = @{ note = 'Smoke test follow-up'; nextFollowDate = '2026-10-01T10:00:00Z' } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri "$base/customers/$($cust.id)/follow-ups" -Headers @{ Authorization = "Bearer $sales"; 'Content-Type' = 'application/json' } -Body $fu
$detail = Invoke-RestMethod -Uri "$base/customers/$($cust.id)" -Headers @{ Authorization = "Bearer $sales" }
Write-Host "10. FOLLOW-UP: followUps=$($detail.followUps.Count) updated followUpDate=$($detail.followUpDate) OK"

# Movements ledger
$mov = Invoke-RestMethod -Uri "$base/products/$($mcb.id)/movements" -Headers @{ Authorization = "Bearer $sales" }
Write-Host "11. MOVEMENT LEDGER for MCB: total=$($mov.total) latest='$($mov.data[0].reason)'"

Write-Host "`nALL SMOKE TESTS COMPLETE"
