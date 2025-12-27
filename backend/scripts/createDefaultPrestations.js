const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Company = require('../models/Company');
const Prestation = require('../models/Prestation');

const connectDB = require('../config/database');

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
  }
];

async function createDefaultPrestations() {
  try {
    await connectDB();
    console.log('✅ Connexion à MongoDB établie');

    // Trouver l'entreprise LibertyWalk
    const company = await Company.findOne({ name: 'LibertyWalk' });
    if (!company) {
      console.log('❌ Entreprise LibertyWalk non trouvée');
      return;
    }
    console.log('✅ Entreprise trouvée:', company.name);

    // Trouver un utilisateur pour créer les prestations
    const user = await User.findOne();
    if (!user) {
      console.log('❌ Aucun utilisateur trouvé');
      return;
    }
    console.log('✅ Utilisateur trouvé:', user.name);

    // Associer l'utilisateur à l'entreprise s'il ne l'est pas déjà
    if (!user.company || user.company.toString() !== company._id.toString()) {
      user.company = company._id;
      await user.save({ validateBeforeSave: false });
      console.log('✅ Utilisateur associé à l\'entreprise');
    }

    // Supprimer les prestations existantes pour cette entreprise
    await Prestation.deleteMany({ company: company._id });
    console.log('✅ Prestations existantes supprimées');

    // Créer les nouvelles prestations
    const prestationsToCreate = defaultPrestations.map(prestation => ({
      ...prestation,
      company: company._id,
      createdBy: user._id
    }));

    const createdPrestations = await Prestation.insertMany(prestationsToCreate);
    console.log(`✅ ${createdPrestations.length} prestations créées pour ${company.name}`);

    // Afficher un résumé
    const prestationsByCategory = await Prestation.aggregate([
      { $match: { company: company._id } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    console.log('\n📊 Résumé des prestations créées:');
    prestationsByCategory.forEach(cat => {
      console.log(`  - ${cat._id}: ${cat.count} prestations`);
    });

    console.log('\n✅ Script terminé avec succès');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur lors de la création des prestations:', error);
    process.exit(1);
  }
}

createDefaultPrestations();
