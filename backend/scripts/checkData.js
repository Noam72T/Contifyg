const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('=== UTILISATEURS ===');
  const users = await User.find({});
  users.forEach(user => {
    console.log(`User: ${user.firstName} ${user.lastName} (${user.username}) - Company: ${user.company || 'AUCUNE'}`);
  });
  
  console.log('\n=== ENTREPRISES ===');
  const companies = await Company.find({});
  companies.forEach(company => {
    console.log(`Company: ${company.name} (${company._id})`);
  });
  
  process.exit(0);
}).catch(console.error);
