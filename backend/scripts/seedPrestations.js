const mongoose = require('mongoose');
const Prestation = require('../models/Prestation');
const Company = require('../models/Company');
const User = require('../models/User');
require('dotenv').config();

const defaultPrestations = [
  // Prestations de service
  {
    name: 'Réparation moteur',
    description: 'Diagnostic et réparation complète du moteur',
    price: 450,
    category: 'Prestation de service',
    icon: 'Cog',
    partner: 'Garage Central'
  },
  {
    name: 'Vidange complète',
    description: 'Changement huile moteur et filtres',
    price: 80,
    category: 'Prestation de service',
    icon: 'CircleDot',
    partner: 'AutoPlus'
  },
  {
    name: 'Plaquettes de frein',
    description: 'Remplacement plaquettes avant/arrière',
    price: 150,
    category: 'Prestation de service',
    icon: 'Ban',
    partner: 'MecaExpert'
  },
  {
    name: 'Diagnostic électronique',
    description: 'Analyse complète des systèmes électroniques',
    price: 60,
    category: 'Prestation de service',
    icon: 'Zap',
    partner: 'CarService Pro'
  },
  {
    name: 'Entretien climatisation',
    description: 'Recharge et nettoyage du système de climatisation',
    price: 90,
    category: 'Prestation de service',
    icon: 'Settings',
    partner: 'Atelier Premium'
  },
  {
    name: 'Réparation carrosserie',
    description: 'Réparation et peinture de carrosserie',
    price: 350,
    category: 'Prestation de service',
    icon: 'Wrench',
    partner: 'Garage Central'
  },

  // Ventes
  {
    name: 'Pneus été 205/55R16',
    description: 'Pneus été haute performance',
    price: 120,
    category: 'Ventes',
    icon: 'CircleDot'
  },
  {
    name: 'Batterie 12V 70Ah',
    description: 'Batterie démarrage haute capacité',
    price: 85,
    category: 'Ventes',
    icon: 'Zap'
  },
  {
    name: 'Huile moteur 5W-30',
    description: 'Huile synthétique 4 litres',
    price: 45,
    category: 'Ventes',
    icon: 'CircleDot'
  },

  // Customs
  {
    name: 'Peinture personnalisée',
    description: 'Peinture sur mesure avec design personnalisé',
    price: 800,
    category: 'Customs',
    icon: 'Palette'
  },
  {
    name: 'Jantes sur mesure',
    description: 'Jantes forgées design exclusif',
    price: 1200,
    category: 'Customs',
    icon: 'Car'
  },
  {
    name: 'Éclairage LED',
    description: 'Kit LED RGB personnalisable',
    price: 350,
    category: 'Customs',
    icon: 'Lightbulb'
  },
  {
    name: 'Système audio',
    description: 'Installation système audio haute qualité',
    price: 950,
    category: 'Customs',
    icon: 'Volume2'
  },
  {
    name: 'Aileron sur mesure',
    description: 'Aileron carbone design sportif',
    price: 450,
    category: 'Customs',
    icon: 'Wind'
  },
  {
    name: 'Tableau de bord custom',
    description: 'Personnalisation du tableau de bord',
    price: 600,
    category: 'Customs',
    icon: 'Gauge'
  },
  {
    name: 'Pare-chocs sportif',
    description: 'Pare-chocs avant/arrière design sportif',
    price: 750,
    category: 'Customs',
    icon: 'CarFront'
  },
  {
    name: 'Échappement sport',
    description: 'Système d\'échappement haute performance',
    price: 850,
    category: 'Customs',
    icon: 'Volume2'
  }
];

async function seedPrestations() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connecté à MongoDB');

    // Récupérer toutes les entreprises
    const companies = await Company.find({});
    console.log(`Trouvé ${companies.length} entreprises`);

    for (const company of companies) {
      console.log(`\nTraitement de l'entreprise: ${company.name}`);
      
      // Trouver un utilisateur de cette entreprise pour créer les prestations
      const user = await User.findOne({ company: company._id });
      
      if (!user) {
        console.log(`Aucun utilisateur trouvé pour l'entreprise ${company.name}, passage à la suivante`);
        continue;
      }

      // Vérifier si cette entreprise a déjà des prestations
      const existingPrestations = await Prestation.find({ company: company._id });
      if (existingPrestations.length > 0) {
        console.log(`L'entreprise ${company.name} a déjà ${existingPrestations.length} prestations, passage à la suivante`);
        continue;
      }

      // Créer les prestations pour cette entreprise
      const prestationsToCreate = defaultPrestations.map(prestation => ({
        ...prestation,
        company: company._id,
        createdBy: user._id
      }));

      await Prestation.insertMany(prestationsToCreate);
      console.log(`Créé ${prestationsToCreate.length} prestations pour l'entreprise ${company.name}`);
    }

    console.log('\nInitialisation des prestations terminée !');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des prestations:', error);
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  seedPrestations();
}

module.exports = { seedPrestations, defaultPrestations };
