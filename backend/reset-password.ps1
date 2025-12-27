# Script de réinitialisation de mot de passe
# Usage: .\reset-password.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RÉINITIALISATION DE MOT DE PASSE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Demander le nom d'utilisateur
$username = Read-Host "Entrez le nom d'utilisateur"

# Demander le nouveau mot de passe
$newPassword = Read-Host "Entrez le nouveau mot de passe" -AsSecureString
$newPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($newPassword))

# Confirmer le mot de passe
$confirmPassword = Read-Host "Confirmez le nouveau mot de passe" -AsSecureString
$confirmPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmPassword))

# Vérifier que les mots de passe correspondent
if ($newPasswordPlain -ne $confirmPasswordPlain) {
    Write-Host ""
    Write-Host "❌ ERREUR: Les mots de passe ne correspondent pas!" -ForegroundColor Red
    exit 1
}

# Vérifier la longueur du mot de passe
if ($newPasswordPlain.Length -lt 6) {
    Write-Host ""
    Write-Host "❌ ERREUR: Le mot de passe doit contenir au moins 6 caractères!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔄 Réinitialisation en cours..." -ForegroundColor Yellow

# Préparer les données JSON
$body = @{
    username = $username
    newPassword = $newPasswordPlain
} | ConvertTo-Json

# URL de l'API (ajustez le port si nécessaire)
$apiUrl = "http://localhost:5005/api/auth/reset-password-temp"

try {
    # Envoyer la requête
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType "application/json"
    
    Write-Host ""
    Write-Host "✅ SUCCÈS: $($response.message)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Vous pouvez maintenant vous connecter avec:" -ForegroundColor Cyan
    Write-Host "  Username: $username" -ForegroundColor White
    Write-Host "  Password: $newPasswordPlain" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ ERREUR lors de la réinitialisation:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host $responseBody -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Vérifiez que:" -ForegroundColor Yellow
    Write-Host "  1. Le serveur backend est démarré (npm run dev)" -ForegroundColor White
    Write-Host "  2. L'utilisateur existe dans la base de données" -ForegroundColor White
    Write-Host "  3. Le port est correct (5005 par défaut)" -ForegroundColor White
    Write-Host ""
    exit 1
}
