// Générateur de code de test simple pour Liberty Walk
// Ce script génère un code valide que vous pouvez utiliser directement

function generateTestCode() {
  // Générer un code de 8 caractères comme dans le modèle CompanyCode
  const code = Math.random().toString(36).substr(2, 8).toUpperCase();
  
  console.log('═══════════════════════════════════════');
  console.log('🎯 CODE DE TEST GÉNÉRÉ POUR LIBERTY WALK');
  console.log('═══════════════════════════════════════');
  console.log(`📝 Code: ${code}`);
  console.log('🏢 Entreprise: Liberty Walk');
  console.log('📊 Utilisations max: 10');
  console.log('📅 Expiration: Aucune');
  console.log('═══════════════════════════════════════');
  
  console.log('\n📋 ÉTAPES POUR UTILISER CE CODE:');
  console.log('1. Démarrez votre serveur backend');
  console.log('2. Utilisez ce code pour tester l\'inscription');
  console.log('3. Endpoint: POST /api/auth-company/register');
  
  console.log('\n💡 EXEMPLE DE REQUÊTE CURL:');
  console.log(`curl -X POST http://localhost:5001/api/auth-company/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "test_user_${Date.now()}",
    "email": "test${Date.now()}@example.com",
    "password": "testPassword123",
    "firstName": "Test",
    "lastName": "User",
    "phoneNumber": "1234567890",
    "companyCode": "${code}"
  }'`);
  
  console.log('\n🔧 EXEMPLE DE BODY JSON:');
  console.log(JSON.stringify({
    username: `test_user_${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    password: "testPassword123",
    firstName: "Test",
    lastName: "User",
    phoneNumber: "1234567890",
    companyCode: code
  }, null, 2));
  
  console.log('\n⚠️  IMPORTANT:');
  console.log('- Ce code doit être ajouté manuellement à la base de données');
  console.log('- Ou utilisez l\'API /api/company-setup/generate-first-code');
  console.log('- Assurez-vous que Liberty Walk existe dans votre DB');
  
  return code;
}

// Générer plusieurs codes pour les tests
console.log('🚀 GÉNÉRATEUR DE CODES DE TEST\n');

for (let i = 1; i <= 3; i++) {
  console.log(`\n--- CODE DE TEST #${i} ---`);
  const testCode = generateTestCode();
  
  if (i < 3) {
    console.log('\n' + '─'.repeat(50));
  }
}

console.log('\n✅ Codes de test générés avec succès!');
console.log('💡 Utilisez l\'un de ces codes pour tester votre inscription.');
