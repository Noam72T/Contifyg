/**
 * Script de configuration rapide : Crée une entreprise + génère un code
 * Usage: node scripts/quickSetup.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const Company = require('../models/Company');
const CompanyCode = require('../models/CompanyCode');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function quickSetup() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('⚡ CONFIGURATION RAPIDE - ENTREPRISE + CODE');
    console.log('═══════════════════════════════════════════════════\n');

    // ÉTAPE 1 : Créer l'entreprise
    console.log('📋 ÉTAPE 1/3 : Informations de l\'entreprise\n');
    
    const companyName = await question('🏢 Nom de l\'entreprise: ');
    if (!companyName) {
      console.log('❌ Le nom est obligatoire');
      process.exit(1);
    }

    console.log('\n🏷️  Catégories disponibles:');
    console.log('   1. Restaurant');
    console.log('   2. Commerce');
    console.log('   3. Service');
    console.log('   4. Industrie');
    console.log('   5. Technologie');
    console.log('   6. Autre\n');
    
    const categoryChoice = await question('Choisir une catégorie (1-6): ') || '6';
    const categories = ['Restaurant', 'Commerce', 'Service', 'Industrie', 'Technologie', 'Autre'];
    const categoryIndex = parseInt(categoryChoice) - 1;
    const category = categories[categoryIndex] || 'Autre';

    // Trouver ou créer un utilisateur
    console.log('\n📋 ÉTAPE 2/3 : Propriétaire de l\'entreprise\n');
    
    const users = await User.find().select('username email firstName lastName systemRole').limit(10);
    
    let owner;
    if (users.length === 0) {
      console.log('⚠️  Aucun utilisateur trouvé. Création d\'un utilisateur admin...\n');
      
      const username = await question('👤 Nom d\'utilisateur: ') || 'admin';
      const email = await question('📧 Email: ') || 'admin@example.com';
      const password = await question('🔒 Mot de passe: ') || 'admin123';

      const User = require('../models/User');
      owner = new User({
        username,
        email,
        password,
        firstName: 'Admin',
        lastName: 'System',
        phoneNumber: '555-0000000',
        compteBancaire: '0000000',
        idUser: `admin_${Date.now()}`,
        systemRole: 'Utilisateur',
        isActive: true,
        isActivated: true
      });

      await owner.save();
      console.log(`✅ Utilisateur créé: ${username}\n`);
    } else {
      console.log('👥 Utilisateurs disponibles:\n');
      users.forEach((user, index) => {
        const name = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.username || user.email;
        console.log(`  ${index + 1}. ${name} (${user.email || user.username})`);
      });

      const choice = await question('\n👤 Choisir le propriétaire (numéro) ou [N] pour nouveau: ');
      
      if (choice.toLowerCase() === 'n') {
        console.log('\n📝 Création d\'un nouvel utilisateur...\n');
        const username = await question('👤 Nom d\'utilisateur: ');
        const email = await question('📧 Email: ');
        const password = await question('🔒 Mot de passe: ');

        owner = new User({
          username,
          email,
          password,
          firstName: username,
          lastName: 'User',
          phoneNumber: '555-0000000',
          compteBancaire: '0000000',
          idUser: `user_${Date.now()}`,
          systemRole: 'Utilisateur',
          isActive: true,
          isActivated: true
        });

        await owner.save();
        console.log(`✅ Utilisateur créé: ${username}\n`);
      } else {
        const index = parseInt(choice) - 1;
        if (isNaN(index) || index < 0 || index >= users.length) {
          console.log('❌ Choix invalide');
          process.exit(1);
        }
        owner = users[index];
      }
    }

    // Créer l'entreprise
    console.log('💾 Création de l\'entreprise...');
    const company = new Company({
      name: companyName,
      description: `Entreprise ${companyName}`,
      category: category,
      owner: owner._id,
      members: [{
        user: owner._id,
        joinedAt: new Date()
      }]
    });

    await company.save();
    console.log('✅ Entreprise créée!\n');

    // Créer le rôle Admin
    console.log('🔐 Création du rôle Admin...');
    const allPermissions = await Permission.find();
    
    const adminRole = new Role({
      nom: 'Admin',
      description: 'Administrateur avec tous les droits',
      company: company._id,
      creePar: owner._id,
      normeSalariale: 100,
      typeContrat: 'DIRECTION',
      isDefault: true,
      permissions: allPermissions.map(p => p._id),
      actif: true
    });

    await adminRole.save();
    console.log('✅ Rôle Admin créé!\n');

    // Assigner l'entreprise au propriétaire
    console.log('👤 Assignation...');
    owner.company = company._id;
    owner.currentCompany = company._id;
    owner.role = adminRole._id;
    owner.isCompanyValidated = true;
    
    if (!owner.companies) owner.companies = [];
    owner.companies.push({
      company: company._id,
      role: adminRole._id,
      joinedAt: new Date()
    });

    await owner.save();
    console.log('✅ Propriétaire assigné!\n');

    // ÉTAPE 3 : Générer un code d'entreprise
    console.log('📋 ÉTAPE 3/3 : Génération du code d\'entreprise\n');
    
    const generateCode = await question('🔑 Générer un code d\'entreprise ? (O/n): ');
    
    let companyCode = null;
    if (generateCode.toLowerCase() !== 'n') {
      console.log('\n🎲 Génération du code...');
      const code = await CompanyCode.generateUniqueCode();
      
      companyCode = new CompanyCode({
        code,
        company: company._id,
        generatedBy: owner._id,
        maxUses: null, // Illimité
        expiresAt: null, // Jamais
        description: `Code initial pour ${companyName}`
      });

      await companyCode.save();
      console.log('✅ Code généré!\n');
    }

    // Résumé final
    console.log('═══════════════════════════════════════════════════');
    console.log('✨ CONFIGURATION TERMINÉE AVEC SUCCÈS');
    console.log('═══════════════════════════════════════════════════');
    console.log(`🏢 Entreprise:   ${company.name}`);
    console.log(`🆔 ID:           ${company._id}`);
    console.log(`👤 Propriétaire: ${owner.username || owner.email}`);
    console.log(`🔑 Rôle:         Admin (${adminRole._id})`);
    if (companyCode) {
      console.log(`🎫 Code:         ${companyCode.code}`);
      console.log(`📊 Utilisations: Illimitées`);
      console.log(`⏰ Expiration:   Jamais`);
    }
    console.log('═══════════════════════════════════════════════════\n');

    if (companyCode) {
      console.log('✅ Vous pouvez maintenant utiliser ce code pour rejoindre l\'entreprise!\n');
    } else {
      console.log('💡 Pour générer un code plus tard:');
      console.log(`   node scripts/generateCompanyCode.js ${company._id}\n`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.connection.close();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

quickSetup();
