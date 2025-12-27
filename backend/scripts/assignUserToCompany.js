const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connexion à la base de données réussie');
  
  // Trouver l'utilisateur et l'entreprise
  const user = await User.findOne({ username: '0smoz' });
  const company = await Company.findOne({ name: 'LibertyWalk' });
  
  if (!user) {
    console.log('Utilisateur non trouvé');
    process.exit(1);
  }
  
  if (!company) {
    console.log('Entreprise non trouvée');
    process.exit(1);
  }
  
  // Assigner l'utilisateur à l'entreprise
  user.company = company._id;
  user.currentCompany = company._id;
  await user.save({ validateBeforeSave: false });
  
  console.log(`Utilisateur ${user.firstName} ${user.lastName} assigné à l'entreprise ${company.name}`);
  
  process.exit(0);
}).catch(console.error);
