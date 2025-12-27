/**
 * Script pour vérifier tous les salaires d'un utilisateur
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Salaire = require('../models/Salaire');

const MONGODB_URI = process.env.MONGODB_URI;

async function checkUserSalaires(username) {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    const user = await User.findOne({ username })
      .populate('company', 'name');
    
    if (!user) {
      console.error(`❌ Utilisateur "${username}" non trouvé`);
      process.exit(1);
    }

    console.log('👤 UTILISATEUR:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Nom: ${user.firstName} ${user.lastName}`);
    console.log(`   Entreprise: ${user.company ? user.company.name : 'Aucune'}`);
    console.log('');

    // Récupérer TOUS les salaires
    const salaires = await Salaire.find({ 
      employe: user._id,
      company: user.company
    }).sort({ createdAt: -1 });

    console.log('💰 TOUS LES SALAIRES:');
    console.log(`   Total: ${salaires.length} salaire(s)\n`);

    if (salaires.length === 0) {
      console.log('   Aucun salaire trouvé');
    } else {
      salaires.forEach((s, index) => {
        console.log(`   ${index + 1}. Salaire ID: ${s._id}`);
        console.log(`      Semaine: ${s.semaine}/${s.annee}`);
        console.log(`      Montant: ${s.montant}$`);
        console.log(`      Statut: ${s.statut}`);
        console.log(`      Date création: ${s.createdAt}`);
        console.log(`      Date paiement: ${s.datePaiement || 'Non payé'}`);
        console.log('');
      });
    }

    // Grouper par statut
    const parStatut = {};
    salaires.forEach(s => {
      if (!parStatut[s.statut]) {
        parStatut[s.statut] = [];
      }
      parStatut[s.statut].push(s);
    });

    console.log('📊 PAR STATUT:');
    Object.keys(parStatut).forEach(statut => {
      const total = parStatut[statut].reduce((sum, s) => sum + s.montant, 0);
      console.log(`   ${statut}: ${parStatut[statut].length} salaire(s), Total: ${total.toFixed(2)}$`);
    });

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('❌ Usage: node scripts/check-user-salaires.js <username>');
  process.exit(1);
}

checkUserSalaires(args[0]);
