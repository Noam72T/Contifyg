require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const user = await User.findOne({username: 'Holl'});
  console.log(`Social score avant: ${user.socialScore}%`);
  user.socialScore = 50;
  await user.save();
  console.log(`✅ Social score réinitialisé à 50%`);
  await mongoose.disconnect();
});
