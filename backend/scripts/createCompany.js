/**
 * Script pour créer une entreprise
 * Usage: node scripts/createCompany.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const Company = require('../models/Company');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');

// Interface pour lire les entrées utilisateur
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fonction pour poser une question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Fonction principale
async function createCompany() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('🏢 CRÉATION D\'UNE NOUVELLE ENTREPRISE');
    console.log('═══════════════════════════════════════════════════\n');

    // Demander les informations de l'entreprise
    const companyName = await question('📝 Nom de l\'entreprise: ');
    if (!companyName) {
      console.log('❌ Le nom de l\'entreprise est obligatoire');
      process.exit(1);
    }

    const description = await question('📄 Description (optionnel): ');
    const category = await question('🏷️  Catégorie (ex: Automobile, Restaurant, Salon): ');

    console.log('\n🔍 Recherche d\'un utilisateur pour être propriétaire...');
    
    // Lister les utilisateurs disponibles
    const users = await User.find().select('username email firstName lastName systemRole').limit(10);
    
    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé. Créez d\'abord un utilisateur.');
      process.exit(1);
    }

    console.log('\n👥 Utilisateurs disponibles:\n');
    users.forEach((user, index) => {
      const name = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.username || user.email;
      console.log(`  ${index + 1}. ${name} (${user.email || user.username}) - ${user.systemRole || 'Utilisateur'}`);
    });

    const ownerChoice = await question('\n👤 Choisir le propriétaire (numéro): ');
    const ownerIndex = parseInt(ownerChoice) - 1;

    if (isNaN(ownerIndex) || ownerIndex < 0 || ownerIndex >= users.length) {
      console.log('❌ Choix invalide');
      process.exit(1);
    }

    const owner = users[ownerIndex];
    console.log(`✅ Propriétaire sélectionné: ${owner.username || owner.email}\n`);

    // Créer l'entreprise
    console.log('💾 Création de l\'entreprise...');
    const company = new Company({
      name: companyName,
      description: description || `Entreprise ${companyName}`,
      category: category || 'Général',
      owner: owner._id,
      members: [{
        user: owner._id,
        joinedAt: new Date()
      }],
      createdAt: new Date()
    });

    await company.save();
    console.log('✅ Entreprise créée avec succès!\n');

    // Créer un rôle Admin avec toutes les permissions
    console.log('🔐 Création du rôle Admin...');
    const allPermissions = await Permission.find();
    
    const adminRole = new Role({
      nom: 'Admin',
      description: 'Administrateur de l\'entreprise avec tous les droits',
      company: company._id,
      creePar: owner._id,
      normeSalariale: 100,
      typeContrat: 'DIRECTION',
      isDefault: true,
      permissions: allPermissions.map(p => p._id),
      actif: true
    });

    await adminRole.save();
    console.log('✅ Rôle Admin créé avec toutes les permissions!\n');

    // Assigner l'entreprise et le rôle au propriétaire
    console.log('👤 Assignation de l\'entreprise au propriétaire...');
    owner.company = company._id;
    owner.currentCompany = company._id;
    owner.role = adminRole._id;
    owner.isCompanyValidated = true;
    
    // Ajouter l'entreprise à la liste des entreprises de l'utilisateur
    if (!owner.companies) {
      owner.companies = [];
    }
    owner.companies.push({
      company: company._id,
      role: adminRole._id,
      joinedAt: new Date()
    });

    await owner.save();
    console.log('✅ Propriétaire assigné à l\'entreprise!\n');

    // Afficher les détails
    console.log('═══════════════════════════════════════════════════');
    console.log('✨ ENTREPRISE CRÉÉE AVEC SUCCÈS');
    console.log('═══════════════════════════════════════════════════');
    console.log(`🏢 Nom:          ${company.name}`);
    console.log(`📄 Description:  ${company.description}`);
    console.log(`🏷️  Catégorie:    ${company.category}`);
    console.log(`🆔 ID:           ${company._id}`);
    console.log(`👤 Propriétaire: ${owner.username || owner.email}`);
    console.log(`🔑 Rôle Admin:   ${adminRole._id}`);
    console.log(`📅 Créée le:     ${company.createdAt.toLocaleDateString('fr-FR')} à ${company.createdAt.toLocaleTimeString('fr-FR')}`);
    console.log('═══════════════════════════════════════════════════\n');

    console.log('💡 Prochaines étapes:');
    console.log('   1. Générer un code d\'entreprise:');
    console.log(`      node scripts/generateCompanyCode.js ${company._id}`);
    console.log('   2. Ou utiliser le script batch:');
    console.log(`      generate-code.bat ${company._id}\n`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code === 11000) {
      console.error('   Une entreprise avec ce nom existe déjà');
    }
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.connection.close();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécuter le script
createCompany();
