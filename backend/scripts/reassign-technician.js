/**
 * Script pour réassigner un Technicien à son entreprise
 * 
 * Usage:
 * node scripts/reassign-technician.js nom_utilisateur id_entreprise
 * 
 * Exemple:
 * node scripts/reassign-technician.js tony_duarte 507f1f77bcf86cd799439011
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Role = require('../models/Role');
const Permission = require('../models/Permission');

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rewind';

async function reassignTechnicianToCompany(username, companyId) {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB\n');

    // 1. Trouver l'utilisateur
    console.log(`🔍 Recherche de l'utilisateur: ${username}`);
    const user = await User.findOne({ username });
    
    if (!user) {
      console.error(`❌ Utilisateur "${username}" non trouvé`);
      process.exit(1);
    }
    
    console.log(`✅ Utilisateur trouvé: ${user.firstName} ${user.lastName}`);
    console.log(`   Rôle système: ${user.systemRole}`);
    console.log(`   Entreprise actuelle: ${user.company || 'Aucune'}\n`);

    // 2. Trouver l'entreprise
    console.log(`🔍 Recherche de l'entreprise: ${companyId}`);
    const company = await Company.findById(companyId);
    
    if (!company) {
      console.error(`❌ Entreprise "${companyId}" non trouvée`);
      process.exit(1);
    }
    
    console.log(`✅ Entreprise trouvée: ${company.name}`);
    console.log(`   Code: ${company.code}`);
    console.log(`   Membres actuels: ${company.members.length}\n`);

    // 3. Trouver ou créer un rôle Admin
    console.log(`🔍 Recherche d'un rôle Admin...`);
    let adminRole = await Role.findOne({ 
      company: companyId,
      nom: { $in: ['Admin', 'PDG', 'Administrateur'] }
    });
    
    if (!adminRole) {
      console.log(`⚠️  Aucun rôle Admin trouvé, création en cours...`);
      
      // Récupérer toutes les permissions
      const allPermissions = await Permission.find();
      console.log(`   ${allPermissions.length} permissions disponibles`);
      
      adminRole = new Role({
        nom: 'Admin',
        description: 'Administrateur de l\'entreprise avec tous les droits',
        company: companyId,
        creePar: user._id,
        normeSalariale: 100,
        typeContrat: 'DIRECTION',
        isDefault: false,
        permissions: allPermissions.map(p => p._id),
        customPermissions: new Map()
      });
      
      await adminRole.save();
      console.log(`✅ Rôle Admin créé avec ${allPermissions.length} permissions\n`);
    } else {
      console.log(`✅ Rôle Admin trouvé: ${adminRole.nom}\n`);
    }

    // 4. Assigner l'utilisateur à l'entreprise
    console.log(`🔧 Assignation de ${username} à ${company.name}...`);
    
    user.company = companyId;
    user.role = adminRole._id;
    user.isCompanyValidated = true;
    user.currentCompany = companyId;
    
    // Mettre à jour ou ajouter dans l'array companies
    const existingCompanyIndex = user.companies.findIndex(
      c => c.company && c.company.toString() === companyId.toString()
    );
    
    if (existingCompanyIndex >= 0) {
      console.log(`   Mise à jour de l'entrée existante dans companies[]`);
      user.companies[existingCompanyIndex].role = adminRole._id;
      user.companies[existingCompanyIndex].isActive = true;
    } else {
      console.log(`   Ajout d'une nouvelle entrée dans companies[]`);
      user.companies.push({
        company: companyId,
        role: adminRole._id,
        isActive: true,
        joinedAt: new Date()
      });
    }
    
    await user.save();
    console.log(`✅ Utilisateur mis à jour\n`);

    // 5. Ajouter l'utilisateur dans company.members
    console.log(`🔧 Ajout dans company.members...`);
    const isMember = company.members.some(m => m.user && m.user.toString() === user._id.toString());
    
    if (!isMember) {
      company.members.push({
        user: user._id,
        role: adminRole._id,
        joinedAt: new Date()
      });
      await company.save();
      console.log(`✅ ${username} ajouté aux membres de ${company.name}`);
    } else {
      // Mettre à jour le rôle si déjà membre
      const memberIndex = company.members.findIndex(m => m.user && m.user.toString() === user._id.toString());
      if (memberIndex >= 0) {
        company.members[memberIndex].role = adminRole._id;
        await company.save();
        console.log(`✅ Rôle de ${username} mis à jour dans ${company.name}`);
      }
    }

    // 6. Résumé final
    console.log('\n' + '='.repeat(60));
    console.log('✅ RÉASSIGNATION RÉUSSIE !');
    console.log('='.repeat(60));
    console.log(`👤 Utilisateur: ${user.username} (${user.firstName} ${user.lastName})`);
    console.log(`🎭 Rôle système: ${user.systemRole}`);
    console.log(`🏢 Entreprise: ${company.name} (${company.code})`);
    console.log(`👔 Rôle dans l'entreprise: ${adminRole.nom}`);
    console.log(`📊 Permissions: ${adminRole.permissions.length}`);
    console.log(`👥 Membres de l'entreprise: ${company.members.length}`);
    console.log('='.repeat(60));
    console.log('\n✅ Le Technicien apparaîtra maintenant dans son entreprise !');

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

// Récupérer les arguments de la ligne de commande
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('❌ Usage: node scripts/reassign-technician.js <username> <companyId>');
  console.log('\nExemple:');
  console.log('  node scripts/reassign-technician.js tony_duarte 507f1f77bcf86cd799439011');
  console.log('\n💡 Astuce: Pour trouver le companyId, utilisez:');
  console.log('  - MongoDB Compass');
  console.log('  - La route GET /api/users/details/:username');
  console.log('  - La page d\'administration Technicien');
  process.exit(1);
}

const [username, companyId] = args;

console.log('\n' + '='.repeat(60));
console.log('🔧 SCRIPT DE RÉASSIGNATION TECHNICIEN');
console.log('='.repeat(60));
console.log(`Username: ${username}`);
console.log(`Company ID: ${companyId}`);
console.log('='.repeat(60) + '\n');

reassignTechnicianToCompany(username, companyId);
