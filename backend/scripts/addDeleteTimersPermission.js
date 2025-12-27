const mongoose = require('mongoose');
const Permission = require('../models/Permission');
require('dotenv').config();

const newPermission = {
  name: 'Supprimer des sessions timer',
  code: 'DELETE_TIMERS',
  description: 'Supprimer des sessions timer dans l\'historique',
  module: 'Timers',
  category: 'ADMINISTRATION'
};

async function addDeleteTimersPermission() {
  try {
    // Se connecter à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/compta');
    console.log('Connexion à MongoDB réussie');

    // Vérifier si la permission existe déjà
    const existingPermission = await Permission.findOne({ code: 'DELETE_TIMERS' });
    if (existingPermission) {
      console.log('La permission DELETE_TIMERS existe déjà');
      process.exit(0);
    }

    // Créer la nouvelle permission
    const permission = new Permission(newPermission);
    await permission.save();
    console.log(`Permission créée: ${permission.name} (${permission.code})`);

    console.log('Permission DELETE_TIMERS ajoutée avec succès');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la permission:', error);
    process.exit(1);
  }
}

// Exécuter le script seulement s'il est appelé directement
if (require.main === module) {
  addDeleteTimersPermission();
}

module.exports = { newPermission };
