const mongoose = require('mongoose');
require('dotenv').config();

async function dropIdUserIndex() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connecté à MongoDB');

    // Accéder à la collection users
    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // Supprimer l'index idUser_1
    try {
      await collection.dropIndex('idUser_1');
      console.log('Index idUser_1 supprimé avec succès');
    } catch (error) {
      if (error.code === 27) {
        console.log('Index idUser_1 n\'existe pas (déjà supprimé)');
      } else {
        throw error;
      }
    }

    // Lister les index restants
    const indexes = await collection.indexes();
    console.log('Index restants:');
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
    process.exit(0);
  }
}

dropIdUserIndex();
