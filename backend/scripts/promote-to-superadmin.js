/**
 * Script pour promouvoir un utilisateur en SuperAdmin
 * 
 * Usage:
 * node scripts/promote-to-superadmin.js nom_utilisateur
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Role = require('../models/Role');

const MONGODB_URI = process.env.MONGODB_URI;

async function promoteToSuperAdmin(username) {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    const user = await User.findOne({ username })
      .populate('company', 'name')
      .populate('role', 'nom');
    
    if (!user) {
      console.error(`❌ Utilisateur "${username}" non trouvé`);
      process.exit(1);
    }

    console.log('👤 UTILISATEUR ACTUEL:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Nom: ${user.firstName} ${user.lastName}`);
    console.log(`   Rôle système actuel: ${user.systemRole}`);
    console.log(`   Entreprise: ${user.company ? user.company.name : 'Aucune'}`);
    console.log(`   Rôle: ${user.role ? user.role.nom : 'Aucun'}`);
    console.log('');

    if (user.systemRole === 'SuperAdmin') {
      console.log('⚠️  L\'utilisateur est déjà SuperAdmin');
      process.exit(0);
    }

    console.log('🔄 Promotion en SuperAdmin...');
    user.systemRole = 'SuperAdmin';
    
    // Réinitialiser les données financières de la semaine
    console.log('💰 Réinitialisation des données financières...');
    user.chiffreAffaires = 0;
    user.avances = 0;
    user.primes = 0;
    user.salaireActuel = 0;
    
    await user.save();

    console.log('\n' + '='.repeat(60));
    console.log('✅ PROMOTION RÉUSSIE !');
    console.log('='.repeat(60));
    console.log(`👤 Utilisateur: ${user.username}`);
    console.log(`⭐ Nouveau rôle: SuperAdmin`);
    console.log(`🏢 Entreprise: ${user.company ? user.company.name : 'Aucune'}`);
    console.log(`👔 Rôle dans l'entreprise: ${user.role ? user.role.nom : 'Aucun'}`);
    console.log('='.repeat(60));
    console.log('\n✨ Avantages du SuperAdmin:');
    console.log('   ✅ Reste visible dans la liste des employés');
    console.log('   ✅ Accès à la page Admin Technicien');
    console.log('   ✅ Peut switcher entre les entreprises');
    console.log('   ✅ Peut créer et gérer des entreprises');
    console.log('   ✅ Peut assigner des utilisateurs');
    console.log('   ✅ Conserve son rôle de PDG/Admin dans son entreprise');
    console.log('\n💰 Données financières réinitialisées:');
    console.log('   ✅ Chiffre d\'affaires: 0$');
    console.log('   ✅ Avances: 0$');
    console.log('   ✅ Primes: 0$');
    console.log('   ✅ Salaire actuel: 0$');

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

// Récupérer les arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('❌ Usage: node scripts/promote-to-superadmin.js <username>');
  console.log('\nExemple:');
  console.log('  node scripts/promote-to-superadmin.js Holl');
  console.log('\n💡 Le rôle SuperAdmin combine les avantages de:');
  console.log('   - Utilisateur normal: Reste visible dans son entreprise');
  console.log('   - Technicien: Accès admin et multi-entreprises');
  process.exit(1);
}

const [username] = args;

console.log('\n' + '='.repeat(60));
console.log('⭐ PROMOTION EN SUPERADMIN');
console.log('='.repeat(60));
console.log(`Username: ${username}`);
console.log('='.repeat(60) + '\n');

promoteToSuperAdmin(username);
