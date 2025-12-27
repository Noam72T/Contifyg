/**
 * Script pour réassigner automatiquement un Technicien à son entreprise d'origine
 * Détecte l'entreprise via les anciennes données (ventes, salaires, employe, etc.)
 * 
 * Usage:
 * node scripts/auto-reassign-technician.js nom_utilisateur
 * 
 * Exemple:
 * node scripts/auto-reassign-technician.js tony_duarte
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const Vente = require('../models/Vente');
const Salaire = require('../models/Salaire');
const Employe = require('../models/Employe');

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rewind';

async function findUserOriginalCompany(user) {
  console.log('🔍 Recherche de l\'entreprise d\'origine...\n');
  
  const possibleCompanies = new Map(); // Map pour compter les occurrences
  
  // 1. Vérifier user.company (entreprise actuelle)
  if (user.company) {
    console.log(`   ✓ Entreprise dans user.company: ${user.company}`);
    possibleCompanies.set(user.company.toString(), {
      id: user.company,
      source: 'user.company',
      count: 10 // Poids élevé
    });
  }
  
  // 2. Vérifier user.companies[] (historique)
  if (user.companies && user.companies.length > 0) {
    console.log(`   ✓ ${user.companies.length} entreprise(s) dans user.companies[]`);
    user.companies.forEach(c => {
      if (c.company) {
        const companyId = c.company.toString();
        if (possibleCompanies.has(companyId)) {
          possibleCompanies.get(companyId).count += 5;
        } else {
          possibleCompanies.set(companyId, {
            id: c.company,
            source: 'user.companies[]',
            count: 5
          });
        }
      }
    });
  }
  
  // 3. Vérifier les ventes de l'utilisateur
  const ventes = await Vente.find({ vendeur: user._id }).select('company').limit(100);
  if (ventes.length > 0) {
    console.log(`   ✓ ${ventes.length} vente(s) trouvée(s)`);
    ventes.forEach(v => {
      if (v.company) {
        const companyId = v.company.toString();
        if (possibleCompanies.has(companyId)) {
          possibleCompanies.get(companyId).count += 1;
        } else {
          possibleCompanies.set(companyId, {
            id: v.company,
            source: 'ventes',
            count: 1
          });
        }
      }
    });
  }
  
  // 4. Vérifier les salaires de l'utilisateur
  const salaires = await Salaire.find({ employe: user._id }).select('company').limit(100);
  if (salaires.length > 0) {
    console.log(`   ✓ ${salaires.length} salaire(s) trouvé(s)`);
    salaires.forEach(s => {
      if (s.company) {
        const companyId = s.company.toString();
        if (possibleCompanies.has(companyId)) {
          possibleCompanies.get(companyId).count += 2;
        } else {
          possibleCompanies.set(companyId, {
            id: s.company,
            source: 'salaires',
            count: 2
          });
        }
      }
    });
  }
  
  // 5. Vérifier les entrées Employe
  const employes = await Employe.find({ utilisateur: user._id }).select('company').limit(100);
  if (employes.length > 0) {
    console.log(`   ✓ ${employes.length} entrée(s) employe trouvée(s)`);
    employes.forEach(e => {
      if (e.company) {
        const companyId = e.company.toString();
        if (possibleCompanies.has(companyId)) {
          possibleCompanies.get(companyId).count += 3;
        } else {
          possibleCompanies.set(companyId, {
            id: e.company,
            source: 'employes',
            count: 3
          });
        }
      }
    });
  }
  
  // 6. Analyser les résultats
  if (possibleCompanies.size === 0) {
    console.log('\n❌ Aucune entreprise trouvée dans les données de l\'utilisateur');
    return null;
  }
  
  // Trier par nombre d'occurrences (poids)
  const sortedCompanies = Array.from(possibleCompanies.entries())
    .sort((a, b) => b[1].count - a[1].count);
  
  console.log('\n📊 Entreprises détectées (par pertinence):');
  for (let i = 0; i < Math.min(3, sortedCompanies.length); i++) {
    const [companyId, data] = sortedCompanies[i];
    const company = await Company.findById(companyId).select('name code');
    console.log(`   ${i + 1}. ${company ? company.name : companyId} (Score: ${data.count}, Source: ${data.source})`);
  }
  
  // Retourner l'entreprise avec le score le plus élevé
  return sortedCompanies[0][1].id;
}

async function getDataStats(userId, companyId) {
  console.log('\n📊 Statistiques des données existantes:');
  
  const stats = {
    ventes: 0,
    salaires: 0,
    employes: 0,
    primes: 0,
    avances: 0
  };
  
  // Compter les ventes
  stats.ventes = await Vente.countDocuments({ 
    vendeur: userId,
    company: companyId 
  });
  
  // Compter les salaires
  stats.salaires = await Salaire.countDocuments({ 
    employe: userId,
    company: companyId 
  });
  
  // Compter les entrées employe
  stats.employes = await Employe.countDocuments({ 
    utilisateur: userId,
    company: companyId 
  });
  
  // Récupérer les montants financiers
  const user = await User.findById(userId).select('primes avances');
  stats.primes = user.primes || 0;
  stats.avances = user.avances || 0;
  
  console.log(`   💰 Ventes: ${stats.ventes}`);
  console.log(`   💵 Salaires: ${stats.salaires}`);
  console.log(`   👤 Entrées Employe: ${stats.employes}`);
  console.log(`   🎁 Primes: ${stats.primes}$`);
  console.log(`   💸 Avances: ${stats.avances}$`);
  
  return stats;
}

async function autoReassignTechnician(username) {
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
    console.log(`   ID: ${user._id}\n`);

    // 2. Détecter l'entreprise d'origine
    const companyId = await findUserOriginalCompany(user);
    
    if (!companyId) {
      console.error('\n❌ Impossible de déterminer l\'entreprise d\'origine');
      console.log('\n💡 Suggestions:');
      console.log('   - Vérifiez que l\'utilisateur a des données (ventes, salaires, etc.)');
      console.log('   - Utilisez le script manuel: node scripts/reassign-technician.js username companyId');
      process.exit(1);
    }
    
    // 3. Récupérer les détails de l'entreprise
    const company = await Company.findById(companyId);
    
    if (!company) {
      console.error(`\n❌ Entreprise "${companyId}" non trouvée en base de données`);
      process.exit(1);
    }
    
    console.log(`\n✅ Entreprise détectée: ${company.name}`);
    console.log(`   Code: ${company.code}`);
    console.log(`   ID: ${company._id}`);

    // 4. Afficher les statistiques des données
    const stats = await getDataStats(user._id, companyId);

    // 5. Demander confirmation (simulation - en production, vous pourriez ajouter un prompt)
    console.log('\n' + '='.repeat(60));
    console.log('📋 RÉSUMÉ DE LA RÉASSIGNATION');
    console.log('='.repeat(60));
    console.log(`👤 Utilisateur: ${user.username} (${user.firstName} ${user.lastName})`);
    console.log(`🏢 Entreprise: ${company.name} (${company.code})`);
    console.log(`📊 Données à préserver: ${stats.ventes} ventes, ${stats.salaires} salaires, ${stats.employes} entrées employe`);
    console.log('='.repeat(60));
    console.log('\n⏳ Réassignation en cours...\n');

    // 6. Trouver ou créer un rôle Admin
    console.log(`🔍 Recherche d'un rôle Admin...`);
    let adminRole = await Role.findOne({ 
      company: companyId,
      nom: { $in: ['Admin', 'PDG', 'Administrateur'] }
    });
    
    if (!adminRole) {
      console.log(`⚠️  Aucun rôle Admin trouvé, création en cours...`);
      
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

    // 7. Assigner l'utilisateur à l'entreprise
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

    // 8. Ajouter l'utilisateur dans company.members
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
      const memberIndex = company.members.findIndex(m => m.user && m.user.toString() === user._id.toString());
      if (memberIndex >= 0) {
        company.members[memberIndex].role = adminRole._id;
        await company.save();
        console.log(`✅ Rôle de ${username} mis à jour dans ${company.name}`);
      }
    }

    // 9. Vérifier que toutes les données sont bien liées
    console.log('\n🔍 Vérification des données...');
    
    const ventesCount = await Vente.countDocuments({ vendeur: user._id, company: companyId });
    const salairesCount = await Salaire.countDocuments({ employe: user._id, company: companyId });
    const employesCount = await Employe.countDocuments({ utilisateur: user._id, company: companyId });
    
    console.log(`   ✅ ${ventesCount} ventes liées à l'entreprise`);
    console.log(`   ✅ ${salairesCount} salaires liés à l'entreprise`);
    console.log(`   ✅ ${employesCount} entrées employe liées à l'entreprise`);

    // 10. Résumé final
    console.log('\n' + '='.repeat(60));
    console.log('✅ RÉASSIGNATION AUTOMATIQUE RÉUSSIE !');
    console.log('='.repeat(60));
    console.log(`👤 Utilisateur: ${user.username} (${user.firstName} ${user.lastName})`);
    console.log(`🎭 Rôle système: ${user.systemRole} (conservé)`);
    console.log(`🏢 Entreprise: ${company.name} (${company.code})`);
    console.log(`👔 Rôle dans l'entreprise: ${adminRole.nom}`);
    console.log(`📊 Permissions: ${adminRole.permissions.length}`);
    console.log(`👥 Membres de l'entreprise: ${company.members.length}`);
    console.log('\n📈 Données préservées:');
    console.log(`   💰 ${ventesCount} ventes`);
    console.log(`   💵 ${salairesCount} salaires`);
    console.log(`   👤 ${employesCount} entrées employe`);
    console.log(`   🎁 ${stats.primes}$ de primes`);
    console.log(`   💸 ${stats.avances}$ d'avances`);
    console.log('='.repeat(60));
    console.log('\n✅ Le Technicien apparaîtra maintenant dans son entreprise avec toutes ses données !');
    console.log('✅ Toutes les ventes, salaires et autres données restent intactes !');

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

if (args.length < 1) {
  console.log('❌ Usage: node scripts/auto-reassign-technician.js <username>');
  console.log('\nExemple:');
  console.log('  node scripts/auto-reassign-technician.js tony_duarte');
  console.log('\n✨ Ce script détecte automatiquement l\'entreprise d\'origine via:');
  console.log('   - user.company et user.companies[]');
  console.log('   - Les ventes de l\'utilisateur');
  console.log('   - Les salaires de l\'utilisateur');
  console.log('   - Les entrées employe');
  console.log('\n💡 Toutes les données (ventes, salaires, etc.) seront préservées !');
  process.exit(1);
}

const [username] = args;

console.log('\n' + '='.repeat(60));
console.log('🤖 SCRIPT DE RÉASSIGNATION AUTOMATIQUE');
console.log('='.repeat(60));
console.log(`Username: ${username}`);
console.log('Mode: Détection automatique de l\'entreprise');
console.log('='.repeat(60) + '\n');

autoReassignTechnician(username);
