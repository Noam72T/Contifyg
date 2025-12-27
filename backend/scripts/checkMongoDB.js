const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 Vérification de la connexion MongoDB...\n');

const checkConnection = async () => {
  try {
    // Afficher l'URI (masqué)
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('❌ MONGODB_URI non défini dans .env');
    }
    
    console.log(`📡 URI: ${uri.replace(/\/\/.*@/, '//***@')}`);
    console.log('⏳ Connexion en cours...\n');

    // Tenter la connexion
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // Timeout de 5 secondes
    });

    console.log('✅ CONNEXION RÉUSSIE!\n');
    console.log('📊 Informations:');
    console.log(`   - Host: ${conn.connection.host}`);
    console.log(`   - Port: ${conn.connection.port}`);
    console.log(`   - Base de données: ${conn.connection.name}`);
    console.log(`   - État: ${conn.connection.readyState === 1 ? 'Connecté' : 'Déconnecté'}`);
    
    // Lister les collections
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`\n📁 Collections (${collections.length}):`);
    if (collections.length > 0) {
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    } else {
      console.log('   (Aucune collection - base de données vide)');
    }

    // Statistiques
    const stats = await conn.connection.db.stats();
    console.log(`\n📈 Statistiques:`);
    console.log(`   - Taille: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Documents: ${stats.objects}`);
    console.log(`   - Index: ${stats.indexes}`);

    await mongoose.connection.close();
    console.log('\n✅ Test terminé avec succès!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERREUR DE CONNEXION!\n');
    console.error(`Message: ${error.message}\n`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 Solutions possibles:');
      console.error('   1. Démarrez MongoDB: mongod --dbpath C:\\data\\db');
      console.error('   2. Ou démarrez le service: net start MongoDB');
      console.error('   3. Vérifiez que le port 27017 est libre');
    } else if (error.message.includes('authentication failed')) {
      console.error('💡 Solutions possibles:');
      console.error('   1. Vérifiez le nom d\'utilisateur et mot de passe');
      console.error('   2. Vérifiez que l\'utilisateur existe dans la base');
    } else if (error.message.includes('MONGODB_URI')) {
      console.error('💡 Solution:');
      console.error('   Ajoutez MONGODB_URI dans le fichier .env');
      console.error('   Exemple: MONGODB_URI=mongodb://localhost:27017/compta_db');
    }
    
    process.exit(1);
  }
};

checkConnection();
