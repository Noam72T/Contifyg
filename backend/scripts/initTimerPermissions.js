const mongoose = require('mongoose');
const Company = require('../models/Company');
const TimerPermission = require('../models/TimerPermission');
const User = require('../models/User');

// Configuration de la base de données
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/compta-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connexion à MongoDB établie');
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB:', error);
    process.exit(1);
  }
};

const initTimerPermissions = async () => {
  try {
    console.log('🚀 Initialisation des permissions Timer...');
    
    // Récupérer toutes les entreprises
    const companies = await Company.find({});
    console.log(`📊 ${companies.length} entreprises trouvées`);
    
    // Récupérer un Technicien pour les autorisations par défaut
    const technician = await User.findOne({ systemRole: 'Technicien' });
    if (!technician) {
      console.log('⚠️  Aucun Technicien trouvé. Les permissions seront créées sans autorisation par défaut.');
    }
    
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const company of companies) {
      // Vérifier si la permission existe déjà
      let permission = await TimerPermission.findOne({ company: company._id });
      
      if (!permission) {
        // Créer une nouvelle permission
        permission = new TimerPermission({
          company: company._id,
          isAuthorized: false, // Par défaut, non autorisé
          features: {
            canCreateVehicles: true,
            canUseTimers: true,
            autoCreateSales: true,
            maxVehicles: 10
          },
          restrictions: {
            maxSessionDuration: 480, // 8 heures
            requireApproval: false,
            approvalThreshold: 1000
          },
          statistics: {
            totalSessions: 0,
            totalRevenue: 0,
            lastUsed: null
          },
          notes: 'Permission créée automatiquement lors de l\'initialisation'
        });
        
        await permission.save();
        createdCount++;
        console.log(`✅ Permission créée pour: ${company.nom}`);
      } else {
        // Mettre à jour la permission existante si nécessaire
        let needsUpdate = false;
        
        if (!permission.features) {
          permission.features = {
            canCreateVehicles: true,
            canUseTimers: true,
            autoCreateSales: true,
            maxVehicles: 10
          };
          needsUpdate = true;
        }
        
        if (!permission.restrictions) {
          permission.restrictions = {
            maxSessionDuration: 480,
            requireApproval: false,
            approvalThreshold: 1000
          };
          needsUpdate = true;
        }
        
        if (!permission.statistics) {
          permission.statistics = {
            totalSessions: 0,
            totalRevenue: 0,
            lastUsed: null
          };
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await permission.save();
          updatedCount++;
          console.log(`🔄 Permission mise à jour pour: ${company.nom}`);
        } else {
          console.log(`ℹ️  Permission déjà existante pour: ${company.nom}`);
        }
      }
    }
    
    console.log('\n📋 Résumé:');
    console.log(`✅ Permissions créées: ${createdCount}`);
    console.log(`🔄 Permissions mises à jour: ${updatedCount}`);
    console.log(`📊 Total entreprises traitées: ${companies.length}`);
    
    if (technician) {
      console.log(`\n👤 Technicien disponible: ${technician.username}`);
      console.log('💡 Les entreprises peuvent maintenant être autorisées via l\'interface d\'administration');
    } else {
      console.log('\n⚠️  Aucun Technicien trouvé. Créez un utilisateur avec le rôle "Technicien" pour pouvoir autoriser les entreprises.');
    }
    
    console.log('\n🎉 Initialisation des permissions Timer terminée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des permissions Timer:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    await initTimerPermissions();
    
    console.log('\n✅ Script terminé avec succès');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
};

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { initTimerPermissions };
