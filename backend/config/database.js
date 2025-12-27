const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Vérifier que MONGODB_URI est défini
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI n\'est pas défini dans le fichier .env');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
    console.log(`📊 Base de données: ${conn.connection.name}`);
    console.log(`🔗 URI: ${process.env.MONGODB_URI.replace(/\/\/.*@/, '//***@')}`); // Masque les credentials
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB:', error.message);
    console.error('💡 Assurez-vous que MongoDB est démarré localement (mongod)');
    console.error('💡 Commande: mongod --dbpath C:\\data\\db');
    process.exit(1);
  }
};

module.exports = connectDB;
