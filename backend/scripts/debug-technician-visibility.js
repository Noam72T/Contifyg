/**
 * Script de diagnostic pour comprendre pourquoi un Technicien n'apparaît pas dans la liste des employés
 * 
 * Usage:
 * node scripts/debug-technician-visibility.js nom_utilisateur id_entreprise
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Employe = require('../models/Employe');
const Role = require('../models/Role');

const MONGODB_URI = process.env.MONGODB_URI;

async function debugTechnicianVisibility(username, companyId) {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    // 1. Récupérer l'utilisateur
    const user = await User.findOne({ username })
      .populate('company', 'name')
      .populate('role', 'nom');
    
    if (!user) {
      console.error(`❌ Utilisateur "${username}" non trouvé`);
      process.exit(1);
    }

    console.log('👤 UTILISATEUR:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Nom: ${user.firstName} ${user.lastName}`);
    console.log(`   System Role: ${user.systemRole}`);
    console.log(`   Company: ${user.company ? user.company.name : 'Aucune'}`);
    console.log(`   Role: ${user.role ? user.role.nom : 'Aucun'}`);
    console.log(`   isCompanyValidated: ${user.isCompanyValidated}`);
    console.log('');

    // 2. Récupérer l'entreprise
    const company = await Company.findById(companyId);
    
    if (!company) {
      console.error(`❌ Entreprise "${companyId}" non trouvée`);
      process.exit(1);
    }

    console.log('🏢 ENTREPRISE:');
    console.log(`   Nom: ${company.name}`);
    console.log(`   Code: ${company.code}`);
    console.log(`   Membres: ${company.members.length}`);
    console.log('');

    // 3. Vérifier si l'utilisateur est dans company.members
    const isMember = company.members.some(m => m.user && m.user.toString() === user._id.toString());
    console.log('📋 DANS COMPANY.MEMBERS:');
    console.log(`   ${isMember ? '✅ OUI' : '❌ NON'}`);
    
    if (isMember) {
      const member = company.members.find(m => m.user && m.user.toString() === user._id.toString());
      console.log(`   Role: ${member.role}`);
      console.log(`   Joined At: ${member.joinedAt}`);
    }
    console.log('');

    // 4. Vérifier si l'utilisateur a une entrée Employe
    const employe = await Employe.findOne({ 
      utilisateur: user._id, 
      company: companyId 
    }).populate('role', 'nom');
    
    console.log('👔 ENTRÉE EMPLOYE:');
    console.log(`   ${employe ? '✅ OUI' : '❌ NON'}`);
    
    if (employe) {
      console.log(`   ID: ${employe._id}`);
      console.log(`   Nom: ${employe.nom} ${employe.prenom}`);
      console.log(`   Role: ${employe.role ? employe.role.nom : 'Aucun'}`);
      console.log(`   Actif: ${employe.actif}`);
      console.log(`   Date embauche: ${employe.dateEmbauche}`);
    }
    console.log('');

    // 5. Compter tous les employés de l'entreprise
    const totalEmployes = await Employe.countDocuments({ company: companyId });
    console.log('📊 STATISTIQUES:');
    console.log(`   Total employés dans Employe: ${totalEmployes}`);
    console.log(`   Total membres dans Company: ${company.members.length}`);
    console.log('');

    // 6. Diagnostic
    console.log('🔍 DIAGNOSTIC:');
    
    if (user.systemRole === 'Technicien') {
      console.log('   ⚠️  L\'utilisateur est un Technicien');
      
      if (!isMember) {
        console.log('   ❌ PROBLÈME: Le Technicien n\'est PAS dans company.members');
        console.log('   💡 Solution: Utiliser le bouton "Assigner" dans Admin Technicien');
      }
      
      if (!employe) {
        console.log('   ❌ PROBLÈME: Le Technicien n\'a PAS d\'entrée Employe');
        console.log('   💡 Solution: Utiliser le bouton "Assigner" dans Admin Technicien');
      }
      
      if (isMember && employe) {
        console.log('   ✅ Le Technicien est correctement assigné');
        console.log('   ℹ️  Il devrait apparaître dans la liste des employés');
      }
    } else {
      console.log('   ℹ️  L\'utilisateur n\'est PAS un Technicien');
      
      if (!isMember || !employe) {
        console.log('   ❌ PROBLÈME: L\'utilisateur n\'est pas correctement assigné');
      } else {
        console.log('   ✅ L\'utilisateur est correctement assigné');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('RÉSUMÉ:');
    console.log('='.repeat(60));
    console.log(`Utilisateur: ${user.username} (${user.systemRole})`);
    console.log(`Entreprise: ${company.name}`);
    console.log(`Dans company.members: ${isMember ? '✅' : '❌'}`);
    console.log(`Entrée Employe: ${employe ? '✅' : '❌'}`);
    console.log(`Devrait apparaître: ${isMember && employe ? '✅ OUI' : '❌ NON'}`);
    console.log('='.repeat(60));

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

if (args.length < 2) {
  console.log('❌ Usage: node scripts/debug-technician-visibility.js <username> <companyId>');
  console.log('\nExemple:');
  console.log('  node scripts/debug-technician-visibility.js Holl 507f1f77bcf86cd799439011');
  process.exit(1);
}

const [username, companyId] = args;

console.log('\n' + '='.repeat(60));
console.log('🔍 DIAGNOSTIC DE VISIBILITÉ TECHNICIEN');
console.log('='.repeat(60));
console.log(`Username: ${username}`);
console.log(`Company ID: ${companyId}`);
console.log('='.repeat(60) + '\n');

debugTechnicianVisibility(username, companyId);
