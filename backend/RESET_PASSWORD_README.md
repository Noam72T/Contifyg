# 🔐 Scripts de Réinitialisation de Mot de Passe

Ces scripts permettent de réinitialiser les mots de passe des utilisateurs qui ont été créés avec l'ancien système `bcrypt` au lieu de `bcryptjs`.

## 📋 Prérequis

1. **Le serveur backend doit être démarré** :
   ```bash
   cd backend
   npm run dev
   ```

2. **La route temporaire doit être active** dans `routes/auth.js` (déjà ajoutée)

## 🚀 Utilisation

### Option 1 : Script PowerShell Interactif (Recommandé)

**Pour réinitialiser UN utilisateur :**

```powershell
cd backend
.\reset-password.ps1
```

Le script vous demandera :
- Nom d'utilisateur
- Nouveau mot de passe
- Confirmation du mot de passe

**Pour réinitialiser PLUSIEURS utilisateurs :**

```powershell
cd backend
.\reset-all-passwords.ps1
```

⚠️ **Avant d'exécuter**, modifiez le fichier `reset-all-passwords.ps1` pour ajouter vos utilisateurs :

```powershell
$users = @(
    @{username = "Louis"; password = "Azerty1234A"},
    @{username = "Jack"; password = "Azerty1234A"},
    @{username = "VotreUser"; password = "VotreMotDePasse"}
)
```

### Option 2 : Script Node.js

```bash
cd backend
node reset-password.js
```

### Option 3 : Commande cURL directe

**Windows PowerShell :**
```powershell
curl -X POST http://localhost:5005/api/auth/reset-password-temp `
  -H "Content-Type: application/json" `
  -d '{"username": "Louis", "newPassword": "Azerty1234A"}'
```

**Linux/Mac :**
```bash
curl -X POST http://localhost:5005/api/auth/reset-password-temp \
  -H "Content-Type: application/json" \
  -d '{"username": "Louis", "newPassword": "Azerty1234A"}'
```

## 📝 Exemples

### Réinitialiser le mot de passe de "Louis"

```powershell
.\reset-password.ps1
# Entrez: Louis
# Nouveau mot de passe: Azerty1234A
# Confirmez: Azerty1234A
```

### Réinitialiser plusieurs comptes en une fois

```powershell
.\reset-all-passwords.ps1
# Réinitialise automatiquement tous les utilisateurs listés dans le script
```

## ✅ Résultat Attendu

```
========================================
  RÉINITIALISATION DE MOT DE PASSE
========================================

Entrez le nom d'utilisateur: Louis
Entrez le nouveau mot de passe: ********
Confirmez le nouveau mot de passe: ********

🔄 Réinitialisation en cours...

✅ SUCCÈS: Mot de passe réinitialisé pour Louis

Vous pouvez maintenant vous connecter avec:
  Username: Louis
  Password: Azerty1234A
```

## 🔒 Sécurité

### ⚠️ IMPORTANT : Supprimer la route temporaire après utilisation

Une fois que tous vos mots de passe sont réinitialisés, **supprimez la route temporaire** de `backend/routes/auth.js` :

1. Ouvrez `backend/routes/auth.js`
2. Supprimez le bloc suivant :

```javascript
// ROUTE TEMPORAIRE - Réinitialiser le mot de passe d'un utilisateur (à supprimer après utilisation)
router.post('/reset-password-temp', async (req, res) => {
  // ... tout le code de la route
});
```

3. Redémarrez le serveur

## 🐛 Dépannage

### Erreur : "Cannot connect to server"

- Vérifiez que le backend est démarré : `npm run dev`
- Vérifiez le port (par défaut 5005)

### Erreur : "Utilisateur non trouvé"

- Vérifiez que l'utilisateur existe dans MongoDB
- Vérifiez l'orthographe du nom d'utilisateur (sensible à la casse)

### Erreur : "Les mots de passe ne correspondent pas"

- Retapez soigneusement les deux mots de passe
- Assurez-vous qu'ils sont identiques

## 📊 Utilisateurs à Réinitialiser

Liste des utilisateurs créés AVANT la correction du bug bcrypt :

- [ ] Louis
- [ ] Jack
- [ ] (Ajoutez vos utilisateurs ici)

## 🎯 Après la Réinitialisation

1. ✅ Tous les nouveaux comptes créés via `/add-account` fonctionneront automatiquement
2. ✅ Les anciens comptes réinitialisés fonctionneront avec leur nouveau mot de passe
3. ✅ Supprimez la route temporaire pour la sécurité
4. ✅ Supprimez ces scripts si vous n'en avez plus besoin

## 📞 Support

Si vous rencontrez des problèmes, vérifiez :
1. Le serveur backend est bien démarré
2. MongoDB est accessible
3. Le port 5005 est correct
4. L'utilisateur existe dans la base de données
