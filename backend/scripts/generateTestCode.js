const mongoose = require('mongoose');
const Company = require('../models/Company');
const User = require('../models/User');
const CompanyCode = require('../models/CompanyCode');
require('dotenv').config();

// Fonction pour se connecter à la base de données
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB:', error);
    process.exit(1);
  }
}

// Fonction pour générer un code pour Liberty Walk
async function generateCodeForLibertyWalk() {
  try {
    console.log('🔍 Recherche de l\'entreprise Liberty Walk...');
    
    // Chercher l'entreprise Liberty Walk
    let company = await Company.findOne({ 
      name: { $regex: /liberty walk/i } 
    }).populate('owner');
    
    if (!company) {
      console.log('⚠️  Entreprise Liberty Walk non trouvée. Création d\'une entreprise de test...');
      
      // Créer un utilisateur propriétaire de test s'il n'existe pas
      let owner = await User.findOne({ username: 'libertywalk_owner' });
      
      if (!owner) {
        console.log('👤 Création d\'un utilisateur propriétaire de test...');
        owner = new User({
          username: 'libertywalk_owner',
          password: 'testPassword123',
          firstName: 'Liberty',
          lastName: 'Walk',
          phoneNumber: '555-1234567',
          isActive: true,
          isCompanyValidated: true
        });
        await owner.save();
        console.log('✅ Propriétaire créé:', owner.username);
      }
      
      // Créer l'entreprise Liberty Walk
      company = new Company({
        name: 'Liberty Walk',
        description: 'Entreprise de tuning automobile spécialisée dans les kits carrosserie',
        category: 'Industrie',
        owner: owner._id,
        pdg: 'Liberty Walk CEO',
        isActive: true
      });
      
      await company.save();
      console.log('✅ Entreprise Liberty Walk créée');
      
      // Initialiser les permissions par défaut
      await company.initializeDefaultPermissions();
      console.log('✅ Permissions par défaut initialisées');
    } else {
      console.log('✅ Entreprise Liberty Walk trouvée:', company.name);
      console.log('🔍 Propriétaire actuel:', company.owner);
    }
    
    // Vérifier s'il y a déjà des codes pour cette entreprise
    const existingCodes = await CompanyCode.find({ 
      company: company._id,
      isActive: true 
    });
    
    console.log(`📊 Codes existants actifs: ${existingCodes.length}`);
    
    if (existingCodes.length > 0) {
      console.log('📋 Codes existants:');
      existingCodes.forEach((code, index) => {
        console.log(`  ${index + 1}. Code: ${code.code} - Utilisations: ${code.currentUses}/${code.maxUses || '∞'}`);
      });
    }
    
    // Générer un nouveau code
    console.log('🔄 Génération d\'un nouveau code...');
    
    const newCode = await CompanyCode.generateUniqueCode();
    
    // S'assurer que company.owner est défini
    let ownerId = company.owner;
    if (!ownerId) {
      // Chercher ou créer un utilisateur propriétaire
      let owner = await User.findOne({ username: 'libertywalk_owner' });
      
      if (!owner) {
        console.log('👤 Création forcée d\'un utilisateur propriétaire...');
        owner = new User({
          username: 'libertywalk_owner',
          password: 'testPassword123',
          firstName: 'Liberty',
          lastName: 'Walk',
          phoneNumber: '555-1234567',
          isActive: true,
          isCompanyValidated: true
        });
        await owner.save();
        console.log('✅ Propriétaire créé:', owner.username);
      }
      
      ownerId = owner._id;
      company.owner = owner._id;
      await company.save();
      console.log('✅ Propriétaire assigné à l\'entreprise:', owner.username);
    }

    console.log('🔍 Utilisation du propriétaire ID:', ownerId);

    const companyCode = new CompanyCode({
      code: newCode,
      company: company._id,
      generatedBy: ownerId,
      maxUses: 10, // Limite à 10 utilisations pour les tests
      expiresAt: null, // Pas d'expiration
      description: 'Code de test généré pour Liberty Walk - Tests d\'inscription'
    });
    
    await companyCode.save();
    
    console.log('\n🎉 CODE GÉNÉRÉ AVEC SUCCÈS !');
    console.log('═══════════════════════════════════════');
    console.log(`📝 Code d'entreprise: ${companyCode.code}`);
    console.log(`🏢 Entreprise: ${company.name}`);
    console.log(`👤 Propriétaire: ${company.owner}`);
    console.log(`📊 Utilisations max: ${companyCode.maxUses}`);
    console.log(`📅 Expire: ${companyCode.expiresAt || 'Jamais'}`);
    console.log(`📄 Description: ${companyCode.description}`);
    console.log('═══════════════════════════════════════');
    
    console.log('\n📋 INSTRUCTIONS POUR TESTER:');
    console.log('1. Utilisez ce code pour vous inscrire via:');
    console.log('   POST /api/auth-company/register');
    console.log('2. Ou pour compléter une inscription Discord via:');
    console.log('   POST /api/discord-company/complete-registration');
    console.log('\n💡 Exemple de body pour l\'inscription:');
    console.log(JSON.stringify({
      username: 'test_user',
      email: 'test@example.com',
      password: 'testPassword123',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '1234567890',
      companyCode: companyCode.code
    }, null, 2));
    
    return {
      code: companyCode.code,
      company: company.name,
      companyId: company._id
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération du code:', error);
    throw error;
  }
}

// Fonction principale
async function main() {
  console.log('🚀 Script de génération de code d\'entreprise pour Liberty Walk');
  console.log('════════════════════════════════════════════════════════════════');
  
  await connectDB();
  
  try {
    const result = await generateCodeForLibertyWalk();
    console.log('\n✅ Script terminé avec succès');
    
    // Fermer la connexion
    await mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
    
  } catch (error) {
    console.error('❌ Erreur dans le script:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main();
}

module.exports = { generateCodeForLibertyWalk };
