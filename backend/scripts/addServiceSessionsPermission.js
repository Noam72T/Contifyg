const mongoose = require('mongoose');
const Permission = require('../models/Permission');
require('dotenv').config();

const addServiceSessionsPermission = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Vérifier si la permission existe déjà
    const existingPermission = await Permission.findOne({ code: 'MANAGE_SERVICE_SESSIONS' });
    
    if (existingPermission) {
      console.log('⚠️  La permission MANAGE_SERVICE_SESSIONS existe déjà');
      process.exit(0);
    }

    // Créer la nouvelle permission
    const newPermission = new Permission({
      name: 'Gérer les sessions de service',
      code: 'MANAGE_SERVICE_SESSIONS',
      description: 'Modifier ou supprimer les sessions de service des employés',
      module: 'Services',
      category: 'ADMINISTRATION'
    });

    await newPermission.save();
    console.log('✅ Permission MANAGE_SERVICE_SESSIONS créée avec succès');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

addServiceSessionsPermission();
