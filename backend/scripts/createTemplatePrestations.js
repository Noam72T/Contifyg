const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Prestation = require('../models/Prestation');
require('dotenv').config();

// Prestations template (modèle de base pour Compta System)
const templatePrestations = [
  // Prestation de service
  {
    name: 'Réparation moteur',
    price: 450,
    category: 'Prestation de service',
    icon: 'Cog',
    description: 'Diagnostic et réparation complète du moteur',
    partner: 'Garage Central'
  },
  {
    name: 'Vidange complète',
    price: 80,
    category: 'Prestation de service',
    icon: 'CircleDot',
    description: 'Changement huile moteur et filtres',
    partner: 'AutoPlus'
  },
  {
    name: 'Plaquettes de frein',
    price: 150,
    category: 'Prestation de service',
    icon: 'Ban',
    description: 'Remplacement plaquettes avant/arrière',
    partner: 'MecaExpert'
  },
  {
    name: 'Diagnostic électronique',
    price: 60,
    category: 'Prestation de service',
    icon: 'Zap',
    description: 'Analyse complète des systèmes électroniques',
    partner: 'CarService Pro'
  },
  {
    name: 'Entretien climatisation',
    price: 90,
    category: 'Prestation de service',
    icon: 'Settings',
    description: 'Recharge et nettoyage du système de climatisation',
    partner: 'Atelier Premium'
  },
  {
    name: 'Réparation carrosserie',
    price: 350,
    category: 'Prestation de service',
    icon: 'Wrench',
    description: 'Réparation et peinture de carrosserie',
    partner: 'Garage Central'
  },

  // Ventes
  {
    name: 'Pneus été 205/55R16',
    price: 120,
    category: 'Ventes',
    icon: 'CircleDot',
    description: 'Pneus été haute performance'
  },
  {
    name: 'Batterie 12V 70Ah',
    price: 85,
    category: 'Ventes',
    icon: 'Zap',
    description: 'Batterie démarrage haute capacité'
  },
  {
    name: 'Huile moteur 5W-30',
    price: 45,
    category: 'Ventes',
    icon: 'CircleDot',
    description: 'Huile synthétique 4 litres'
  },

  // Customs
  {
    name: 'Peinture personnalisée',
    price: 800,
    category: 'Customs',
    icon: 'Palette',
    description: 'Peinture sur mesure avec design personnalisé'
  },
  {
    name: 'Jantes sur mesure',
    price: 1200,
    category: 'Customs',
    icon: 'Car',
    description: 'Jantes forgées design exclusif'
  },
  {
    name: 'Éclairage LED',
    price: 350,
    category: 'Customs',
    icon: 'Lightbulb',
    description: 'Kit LED RGB personnalisable'
  },
  {
    name: 'Système audio',
    price: 950,
    category: 'Customs',
    icon: 'Volume2',
    description: 'Installation système audio haute qualité'
  },
  {
    name: 'Aileron sur mesure',
    price: 450,
    category: 'Customs',
    icon: 'Wind',
    description: 'Aileron carbone design sportif'
  },
  {
    name: 'Tableau de bord custom',
    price: 600,
    category: 'Customs',
    icon: 'Gauge',
    description: 'Personnalisation du tableau de bord'
  },
  {
    name: 'Pare-chocs sportif',
    price: 750,
    category: 'Customs',
    icon: 'CarFront',
    description: 'Pare-chocs avant/arrière design sportif'
  },
  {
    name: 'Échappement sport',
    price: 580,
    category: 'Customs',
    icon: 'Settings',
    description: 'Système d\'échappement haute performance'
  }
];

const createTemplateAndCompanyPrestations = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connecté à MongoDB');

    // Supprimer toutes les prestations existantes
    await Prestation.deleteMany({});
    console.log('Prestations existantes supprimées');

    // Récupérer toutes les entreprises
    const companies = await Company.find({});
    console.log(`Trouvé ${companies.length} entreprises`);

    // Pour chaque entreprise, créer les prestations du template
    for (const company of companies) {
      console.log(`\nTraitement de l'entreprise: ${company.name}`);
      
      // Trouver un utilisateur de cette entreprise pour être le créateur
      const user = await User.findOne({ company: company._id });
      
      if (!user) {
        console.log(`Aucun utilisateur trouvé pour l'entreprise ${company.name}, passage à la suivante`);
        continue;
      }

      // Créer toutes les prestations du template pour cette entreprise
      for (const templatePrestation of templatePrestations) {
        const prestation = new Prestation({
          ...templatePrestation,
          company: company._id,
          createdBy: user._id
        });

        await prestation.save();
      }

      console.log(`${templatePrestations.length} prestations créées pour ${company.name}`);
    }

    // Créer aussi des prestations "globales" pour Compta System (sans entreprise spécifique)
    // Ces prestations serviront de template de base
    const adminUser = await User.findOne({ systemRole: 'Technicien' });
    if (adminUser) {
      console.log('\nCréation des prestations template pour Compta System...');
      
      for (const templatePrestation of templatePrestations) {
        const prestation = new Prestation({
          ...templatePrestation,
          company: null, // Pas d'entreprise spécifique = template global
          createdBy: adminUser._id
        });

        await prestation.save();
      }
      
      console.log(`${templatePrestations.length} prestations template créées pour Compta System`);
    }

    console.log('\nInitialisation des prestations terminée !');
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
};

createTemplateAndCompanyPrestations();
