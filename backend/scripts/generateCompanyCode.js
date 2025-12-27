/**
 * Script pour générer un code d'entreprise
 * Usage: node scripts/generateCompanyCode.js [companyId] [options]
 * 
 * Options:
 *   --maxUses=10          Nombre maximum d'utilisations (défaut: illimité)
 *   --expiresInDays=30    Expire dans X jours (défaut: jamais)
 *   --description="..."   Description du code
 * 
 * Exemples:
 *   node scripts/generateCompanyCode.js 507f1f77bcf86cd799439011
 *   node scripts/generateCompanyCode.js 507f1f77bcf86cd799439011 --maxUses=5 --expiresInDays=30
 */

require('dotenv').config();
const mongoose = require('mongoose');
const CompanyCode = require('../models/CompanyCode');
const Company = require('../models/Company');
const User = require('../models/User');

// Fonction pour parser les arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    companyId: args[0],
    maxUses: null,
    expiresInDays: null,
    description: null
  };

  args.forEach(arg => {
    if (arg.startsWith('--maxUses=')) {
      options.maxUses = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--expiresInDays=')) {
      options.expiresInDays = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--description=')) {
      options.description = arg.split('=')[1].replace(/"/g, '');
    }
  });

  return options;
}

// Fonction principale
async function generateCompanyCode() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB\n');

    const options = parseArgs();

    // Si aucun companyId fourni, lister les entreprises
    if (!options.companyId) {
      console.log('📋 Liste des entreprises disponibles:\n');
      const companies = await Company.find().select('name _id').limit(20);
      
      if (companies.length === 0) {
        console.log('❌ Aucune entreprise trouvée');
        process.exit(1);
      }

      companies.forEach(company => {
        console.log(`  ${company._id} - ${company.name}`);
      });
      
      console.log('\n💡 Usage: node scripts/generateCompanyCode.js [companyId] [options]');
      console.log('   Exemple: node scripts/generateCompanyCode.js', companies[0]._id);
      process.exit(0);
    }

    // Vérifier que l'entreprise existe
    console.log('🔍 Vérification de l\'entreprise...');
    const company = await Company.findById(options.companyId);
    
    if (!company) {
      console.log(`❌ Entreprise non trouvée avec l'ID: ${options.companyId}`);
      process.exit(1);
    }

    console.log(`✅ Entreprise trouvée: ${company.name}\n`);

    // Trouver le propriétaire ou un admin
    const owner = await User.findById(company.owner);
    if (!owner) {
      console.log('❌ Propriétaire de l\'entreprise non trouvé');
      process.exit(1);
    }

    // Générer un code unique
    console.log('🎲 Génération d\'un code unique...');
    const code = await CompanyCode.generateUniqueCode();
    console.log(`✅ Code généré: ${code}\n`);

    // Calculer la date d'expiration si spécifiée
    let expiresAt = null;
    if (options.expiresInDays && options.expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + options.expiresInDays);
    }

    // Créer le code d'entreprise
    console.log('💾 Sauvegarde du code dans la base de données...');
    const companyCode = new CompanyCode({
      code,
      company: company._id,
      generatedBy: owner._id,
      maxUses: options.maxUses,
      expiresAt,
      description: options.description || `Code généré le ${new Date().toLocaleDateString('fr-FR')}`
    });

    await companyCode.save();
    console.log('✅ Code sauvegardé avec succès!\n');

    // Afficher les détails du code
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 DÉTAILS DU CODE D\'ENTREPRISE');
    console.log('═══════════════════════════════════════════════════');
    console.log(`🏢 Entreprise:      ${company.name}`);
    console.log(`🔑 Code:            ${companyCode.code}`);
    console.log(`📝 Description:     ${companyCode.description}`);
    console.log(`👤 Généré par:      ${owner.username || owner.email}`);
    console.log(`📊 Max utilisations: ${companyCode.maxUses || 'Illimité'}`);
    console.log(`⏰ Expire le:       ${companyCode.expiresAt ? companyCode.expiresAt.toLocaleDateString('fr-FR') : 'Jamais'}`);
    console.log(`📅 Créé le:         ${companyCode.createdAt.toLocaleDateString('fr-FR')} à ${companyCode.createdAt.toLocaleTimeString('fr-FR')}`);
    console.log('═══════════════════════════════════════════════════\n');

    console.log('✨ Code prêt à être utilisé!\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécuter le script
generateCompanyCode();
