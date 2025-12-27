// Charge les variables d'environnement depuis le fichier .env
require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');

// Script pour corriger les problèmes d'index discordId
async function fixDiscordIndex() {
  try {
    console.log('🔧 Démarrage de la correction des index discordId...');

    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('❌ La variable d’environnement MONGODB_URI est introuvable. Vérifie ton fichier .env');
    }

    // Connecter à MongoDB
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connecté à MongoDB');

    // 1. Supprimer l'ancien index discordId_1 s'il existe
    try {
      await User.collection.dropIndex('discordId_1');
      console.log('✅ Ancien index discordId_1 supprimé');
    } catch (error) {
      console.log('ℹ️ Ancien index discordId_1 n\'existe pas ou déjà supprimé');
    }

    // 2. Trouver tous les utilisateurs avec discordId null et les nettoyer
    const usersWithNullDiscordId = await User.find({
      $or: [
        { discordId: null },
        { discordId: '' },
        { discordId: 'null' }
      ]
    });

    console.log(`📊 Trouvé ${usersWithNullDiscordId.length} utilisateurs avec discordId null/vide`);

    // 3. Supprimer le champ discordId pour ces utilisateurs
    for (const user of usersWithNullDiscordId) {
      await User.updateOne(
        { _id: user._id },
        { $unset: { discordId: 1 } }
      );
      console.log(`🧹 Nettoyé discordId pour utilisateur: ${user.username}`);
    }

    // 4. Recréer l'index avec les bonnes options
    try {
      await User.collection.createIndex(
        { discordId: 1 },
        { unique: true, sparse: true, name: 'discordId_unique_sparse' }
      );
      console.log('✅ Nouvel index discordId créé avec options sparse + unique');
    } catch (error) {
      console.log('ℹ️ Index discordId existe déjà ou erreur:', error.message);
    }

    // 5. Vérifier les index existants
    const indexes = await User.collection.indexes();
    console.log('📋 Index actuels sur la collection users:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('✅ Correction terminée avec succès!');

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  fixDiscordIndex().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = fixDiscordIndex;
