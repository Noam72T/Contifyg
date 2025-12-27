const mongoose = require('mongoose');
require('dotenv').config();

async function fixStockIndex() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/comptabilite');
    console.log('✅ Connecté à MongoDB');

    const db = mongoose.connection.db;
    const stockCollection = db.collection('stocks');

    // Lister tous les index existants
    const indexes = await stockCollection.indexes();
    console.log('📋 Index existants:', indexes.map(idx => idx.name));

    // Supprimer l'ancien index unique qui cause le problème
    try {
      await stockCollection.dropIndex('item_1_company_1');
      console.log('🗑️ Ancien index item_1_company_1 supprimé');
    } catch (error) {
      console.log('ℹ️ Index item_1_company_1 n\'existe pas ou déjà supprimé');
    }

    // Calculer la semaine courante
    const getCurrentWeek = () => {
      const date = new Date();
      const d = new Date(date.getTime());
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
      const week1 = new Date(d.getFullYear(), 0, 4);
      return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };

    const currentWeek = getCurrentWeek();
    const currentYear = new Date().getFullYear();

    // Mettre à jour tous les stocks existants pour ajouter semaine et année
    const result = await stockCollection.updateMany(
      { 
        $or: [
          { semaine: { $exists: false } },
          { annee: { $exists: false } }
        ]
      },
      { 
        $set: { 
          semaine: currentWeek,
          annee: currentYear
        }
      }
    );

    console.log(`🔄 ${result.modifiedCount} stocks mis à jour avec semaine ${currentWeek} et année ${currentYear}`);

    // Créer le nouvel index unique
    await stockCollection.createIndex(
      { item: 1, company: 1, semaine: 1, annee: 1 }, 
      { unique: true }
    );
    console.log('✅ Nouvel index unique créé: item_1_company_1_semaine_1_annee_1');

    // Vérifier les nouveaux index
    const newIndexes = await stockCollection.indexes();
    console.log('📋 Nouveaux index:', newIndexes.map(idx => idx.name));

    console.log('✅ Migration terminée avec succès!');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécuter le script
fixStockIndex();
