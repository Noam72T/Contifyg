const mongoose = require('mongoose');
const Permission = require('../models/Permission');

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/comptabilite', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const itemPermissions = [
  {
    name: 'Voir les produits',
    code: 'VOIR_PRODUITS',
    description: 'Permet de voir la liste des produits et services',
    category: 'GESTION'
  },
  {
    name: 'Créer des produits',
    code: 'CREER_PRODUITS',
    description: 'Permet de créer de nouveaux produits et services',
    category: 'GESTION'
  },
  {
    name: 'Modifier des produits',
    code: 'MODIFIER_PRODUITS',
    description: 'Permet de modifier les produits et services existants',
    category: 'GESTION'
  },
  {
    name: 'Supprimer des produits',
    code: 'SUPPRIMER_PRODUITS',
    description: 'Permet de supprimer des produits et services',
    category: 'ADMINISTRATION'
  }
];

async function initItemPermissions() {
  try {
    console.log('🔄 Initialisation des permissions pour les items...');

    for (const permData of itemPermissions) {
      // Vérifier si la permission existe déjà
      const existingPermission = await Permission.findOne({ code: permData.code });
      
      if (!existingPermission) {
        const permission = new Permission(permData);
        await permission.save();
        console.log(`✅ Permission créée: ${permData.name} (${permData.code})`);
      } else {
        console.log(`⚠️  Permission déjà existante: ${permData.name} (${permData.code})`);
      }
    }

    console.log('\n✅ Initialisation des permissions des items terminée !');
    
    // Afficher toutes les permissions des items
    console.log('\n📋 Permissions des items disponibles:');
    const allItemPermissions = await Permission.find({
      code: { $in: itemPermissions.map(p => p.code) }
    });
    
    allItemPermissions.forEach(perm => {
      console.log(`   - ${perm.name} (${perm.code}) - Catégorie: ${perm.category}`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des permissions:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

// Exécuter le script
initItemPermissions();
