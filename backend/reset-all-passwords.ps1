# Script de réinitialisation de plusieurs mots de passe
# Usage: .\reset-all-passwords.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RÉINITIALISATION MULTIPLE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Liste des utilisateurs à réinitialiser
# Format: @{username = "nom"; password = "motdepasse"}
$users = @(
    @{username = "Louis"; password = "Azerty1234A"},
    @{username = "Jack"; password = "Azerty1234A"}
    # Ajoutez d'autres utilisateurs ici si nécessaire
)

$apiUrl = "http://localhost:5005/api/auth/reset-password-temp"
$successCount = 0
$errorCount = 0

Write-Host "📋 Utilisateurs à réinitialiser: $($users.Count)" -ForegroundColor Cyan
Write-Host ""

foreach ($user in $users) {
    Write-Host "🔄 Réinitialisation de: $($user.username)..." -ForegroundColor Yellow
    
    $body = @{
        username = $user.username
        newPassword = $user.password
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType "application/json"
        Write-Host "  ✅ $($response.message)" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "  ❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Réussis: $successCount" -ForegroundColor Green
Write-Host "❌ Erreurs: $errorCount" -ForegroundColor Red
Write-Host ""

if ($successCount -gt 0) {
    Write-Host "Les mots de passe ont été réinitialisés avec succès!" -ForegroundColor Green
    Write-Host "Mot de passe par défaut: Azerty1234A" -ForegroundColor Cyan
}
