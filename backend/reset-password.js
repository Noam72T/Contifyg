// Script Node.js pour réinitialiser les mots de passe
// Usage: node reset-password.js

const readline = require('readline');
const https = require('http');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  RÉINITIALISATION DE MOT DE PASSE\x1b[0m');
console.log('\x1b[36m========================================\x1b[0m');
console.log('');

// Fonction pour poser une question
function question(query) {


Code


  return new Promise(resolve => rl.question(query, resolve));
}

// Fonction pour réinitialiser le mot de passe
async function resetPassword(username, newPassword) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      username: username,
      newPassword: newPassword
    });

    const options = {
      hostname: 'localhost',
      port: 5005,
      path: '/api/auth/reset-password-temp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.message));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Fonction principale
async function main() {
  try {
    // Demander le nom d'utilisateur
    const username = await question('Entrez le nom d\'utilisateur: ');
    
    // Demander le nouveau mot de passe
    const newPassword = await question('Entrez le nouveau mot de passe: ');
    
    // Confirmer le mot de passe
    const confirmPassword = await question('Confirmez le nouveau mot de passe: ');
    
    // Vérifier que les mots de passe correspondent
    if (newPassword !== confirmPassword) {
      console.log('\n\x1b[31m❌ ERREUR: Les mots de passe ne correspondent pas!\x1b[0m\n');
      rl.close();
      process.exit(1);
    }
    
    // Vérifier la longueur du mot de passe
    if (newPassword.length < 6) {
      console.log('\n\x1b[31m❌ ERREUR: Le mot de passe doit contenir au moins 6 caractères!\x1b[0m\n');
      rl.close();
      process.exit(1);
    }
    
    console.log('\n\x1b[33m🔄 Réinitialisation en cours...\x1b[0m\n');
    
    // Réinitialiser le mot de passe
    const response = await resetPassword(username, newPassword);
    
    console.log('\x1b[32m✅ SUCCÈS: ' + response.message + '\x1b[0m\n');
    console.log('\x1b[36mVous pouvez maintenant vous connecter avec:\x1b[0m');
    console.log('  Username: ' + username);
    console.log('  Password: ' + newPassword);
    console.log('');
    
  } catch (error) {
    console.log('\n\x1b[31m❌ ERREUR lors de la réinitialisation:\x1b[0m');
    console.log('\x1b[31m' + error.message + '\x1b[0m\n');
    
    console.log('\x1b[33mVérifiez que:\x1b[0m');
    console.log('  1. Le serveur backend est démarré (npm run dev)');
    console.log('  2. L\'utilisateur existe dans la base de données');
    console.log('  3. Le port est correct (5005 par défaut)');
    console.log('');
  } finally {
    rl.close();
  }
}

// Lancer le script
main();
