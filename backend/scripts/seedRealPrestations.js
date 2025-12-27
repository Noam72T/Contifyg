const mongoose = require('mongoose');
const Company = require('../models/Company');
const User = require('../models/User');
const Prestation = require('../models/Prestation');
require('dotenv').config();

const realPrestations = [
  // Prestations de service
  {
    name: 'Véhicule Sport',
    description: 'Véhicule de sport haute performance',
    price: 50000,
    category: 'Prestation de service',
    icon: 'Car'
  },
  {
    name: 'Véhicule Familial', 
    description: 'Véhicule familial spacieux',
    price: 25000,
    category: 'Prestation de service',
    icon: 'CircleDot'
  },
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
  }
];

async function seedPrestations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connecté à MongoDB');

    // Trouver toutes les entreprises
    const companies = await Company.find({});
    console.log(`Trouvé ${companies.length} entreprises`);

    for (const company of companies) {
      console.log(`\nTraitement de l'entreprise: ${company.name}`);
      
      // Trouver un utilisateur de cette entreprise
      const user = await User.findOne({ company: company._id });
      
      if (!user) {
        console.log(`Aucun utilisateur trouvé pour l'entreprise ${company.name}, création de prestations avec l'owner`);
        // Utiliser l'owner de l'entreprise
        const owner = await User.findById(company.owner);
        if (!owner) {
          console.log(`Owner non trouvé pour ${company.name}, passage à la suivante`);
          continue;
        }
        
        // Assigner l'owner à cette entreprise s'il ne l'est pas déjà
        if (!owner.company || owner.company.toString() !== company._id.toString()) {
          owner.company = company._id;
          owner.currentCompany = company._id;
          await owner.save({ validateBeforeSave: false });
          console.log(`Owner ${owner.firstName} ${owner.lastName} assigné à l'entreprise ${company.name}`);
        }
      }

      const creatorUser = user || await User.findById(company.owner);

      // Supprimer les prestations existantes pour cette entreprise
      await Prestation.deleteMany({ company: company._id });
      console.log(`Prestations existantes supprimées pour ${company.name}`);

      // Créer les prestations pour cette entreprise
      const prestationsToCreate = realPrestations.map(prestation => ({
        ...prestation,
        company: company._id,
        createdBy: creatorUser._id
      }));

      const createdPrestations = await Prestation.insertMany(prestationsToCreate);
      console.log(`${createdPrestations.length} prestations créées pour ${company.name}`);
    }

    console.log('\nInitialisation des prestations terminée !');
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

seedPrestations();
