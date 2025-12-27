const mongoose = require('mongoose');
const Partenariat = require('../models/Partenariat');

// Configuration de la base de données
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/comptabilite';

async function migratePartenaritSemaines() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connexion à MongoDB établie');

    // Récupérer tous les partenariats
    const partenariats = await Partenariat.find({});
    console.log(`📊 ${partenariats.length} partenariats trouvés`);

    let migratedCount = 0;

    for (const partenariat of partenariats) {
      let needsUpdate = false;
      
      // Migrer semaineActuelle si c'est une string
      if (typeof partenariat.semaineActuelle === 'string' && partenariat.semaineActuelle) {
        // Extraire le numéro de la string "S37" -> 37
        const match = partenariat.semaineActuelle.match(/S?(\d+)/);
        if (match) {
          partenariat.semaineActuelle = parseInt(match[1]);
          needsUpdate = true;
          console.log(`🔄 Migration semaineActuelle: "${match[0]}" -> ${partenariat.semaineActuelle}`);
        }
      }

      // Migrer gainsParSemaine
      if (partenariat.gainsParSemaine && partenariat.gainsParSemaine.length > 0) {
        partenariat.gainsParSemaine.forEach((gain, index) => {
          if (typeof gain.semaine === 'string') {
            // Extraire le numéro de la string "S37" -> 37
            const match = gain.semaine.match(/S?(\d+)/);
            if (match) {
              gain.semaine = parseInt(match[1]);
              needsUpdate = true;
              console.log(`🔄 Migration gain[${index}].semaine: "${match[0]}" -> ${gain.semaine}`);
            }
          }
        });
      }

      // Sauvegarder si des modifications ont été faites
      if (needsUpdate) {
        await partenariat.save();
        migratedCount++;
        console.log(`✅ Partenariat "${partenariat.nom}" migré avec succès`);
      }
    }

    console.log(`\n🎉 Migration terminée avec succès!`);
    console.log(`📈 ${migratedCount} partenariats mis à jour sur ${partenariats.length}`);

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    // Fermer la connexion
    await mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
    process.exit(0);
  }
}

// Exécuter la migration
console.log('🚀 Démarrage de la migration des semaines des partenariats...');
migratePartenaritSemaines();
