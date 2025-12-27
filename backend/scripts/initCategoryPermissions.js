const mongoose = require('mongoose');
const Permission = require('../models/Permission');
require('dotenv').config();

// Se connecter à MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const initCategoryPermissions = async () => {
  try {
    console.log('Initialisation des permissions par catégories...');

    // Créer les permissions avec upsert pour éviter les doublons
    console.log('Suppression des anciennes permissions de catégories...');
    await Permission.deleteMany({
      code: { $in: [
        'VIEW_ADMINISTRATION', 'VIEW_ADMINISTRATION_CATEGORY',
        'VIEW_PAPERASSE', 'VIEW_PAPERASSE_CATEGORY', 
        'VIEW_GESTION', 'VIEW_GESTION_CATEGORY',
        'ADMINISTRATION_MANAGE',
        'MANAGE_PAPERASSE', 'PAPERASSE_MANAGE',
        'GESTION_MANAGE'
      ] }
    });

    // Permissions basées sur les catégories de prestations
    const categoryPermissions = [
      // === PERMISSIONS GENERALE ===
      {
        name: 'Voir catégorie générale',
        code: 'VIEW_GENERALE_CATEGORY',
        description: 'Accès à la catégorie générale',
        module: 'CATEGORIES',
        category: 'GENERALE'
      },
      {
        name: 'Gestion Générale',
        code: 'MANAGE_GENERALE',
        description: 'Permet de gérer les éléments de la catégorie Générale',
        module: 'Generale',
        category: 'GENERALE'
      },

      // === PERMISSIONS PAPERASSE ===
      {
        name: 'Voir catégorie paperasse',
        code: 'VIEW_PAPERASSE_CATEGORY',
        description: 'Accès à la catégorie paperasse',
        module: 'CATEGORIES',
        category: 'PAPERASSE'
      },
      {
        name: 'Gestion Paperasse',
        code: 'MANAGE_PAPERASSE',
        description: 'Permet de gérer les documents de la catégorie Paperasse',
        module: 'Paperasse',
        category: 'PAPERASSE'
      },
      {
        name: 'Gestion Bilans',
        code: 'MANAGE_BILANS',
        description: 'Permet de gérer les bilans comptables',
        module: 'Paperasse',
        category: 'PAPERASSE'
      },
      {
        name: 'Gestion Charges',
        code: 'MANAGE_CHARGES',
        description: 'Permet de gérer les charges',
        module: 'Paperasse',
        category: 'PAPERASSE'
      },
      {
        name: 'Gestion Factures',
        code: 'MANAGE_FACTURES',
        description: 'Permet de gérer les factures',
        module: 'Paperasse',
        category: 'PAPERASSE'
      },

      // === PERMISSIONS ADMINISTRATION ===
      {
        name: 'Voir catégorie administration',
        code: 'VIEW_ADMINISTRATION_CATEGORY',
        description: 'Accès à la catégorie administration',
        module: 'CATEGORIES',
        category: 'ADMINISTRATION'
      },
      {
        name: 'Gestion Employés',
        code: 'MANAGE_EMPLOYES',
        description: 'Permet de gérer les employés',
        module: 'Administration',
        category: 'ADMINISTRATION'
      },
      {
        name: 'Gestion Salaires',
        code: 'MANAGE_SALAIRES',
        description: 'Permet de gérer les salaires',
        module: 'Administration',
        category: 'ADMINISTRATION'
      },
      {
        name: 'Gestion Ventes',
        code: 'MANAGE_VENTES',
        description: 'Permet de gérer les ventes',
        module: 'Administration',
        category: 'ADMINISTRATION'
      },

      // === PERMISSIONS GESTION ===
      {
        name: 'Voir catégorie gestion',
        code: 'VIEW_GESTION_CATEGORY',
        description: 'Accès à la catégorie gestion',
        module: 'CATEGORIES',
        category: 'GESTION'
      },
      {
        name: 'Gestion des Rôles',
        code: 'MANAGE_ROLES',
        description: 'Permet de créer, modifier et supprimer les rôles',
        module: 'Gestion',
        category: 'GESTION'
      },
      {
        name: 'Gestion des Items',
        code: 'MANAGE_ITEMS',
        description: 'Permet de gérer les articles et produits',
        module: 'Gestion',
        category: 'GESTION'
      },
      {
        name: 'Gestion Partenariats',
        code: 'MANAGE_PARTNERSHIPS',
        description: 'Permet de gérer les partenaires',
        module: 'Gestion',
        category: 'GESTION'
      },
      {
        name: 'Gestion Entreprise',
        code: 'MANAGE_COMPANY',
        description: 'Permet de gérer les paramètres de l\'entreprise',
        module: 'Gestion',
        category: 'GESTION'
      }
    ];

    // Créer les permissions une par une pour éviter les conflits
    const createdPermissions = [];
    for (const permission of categoryPermissions) {
      try {
        const existing = await Permission.findOne({ code: permission.code });
        if (!existing) {
          const created = await Permission.create(permission);
          createdPermissions.push(created);
          console.log(`✅ Permission créée: ${permission.code}`);
        } else {
          console.log(`⚠️ Permission existante: ${permission.code}`);
          createdPermissions.push(existing);
        }
      } catch (error) {
        console.log(`❌ Erreur pour ${permission.code}:`, error.message);
      }
    }
    console.log(`${createdPermissions.length} permissions créées avec succès:`);
    
    console.log('\n=== PERMISSIONS PAR CATÉGORIE ===');
    
    // Grouper par catégorie pour l'affichage
    const permissionsByCategory = createdPermissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {});
    
    Object.entries(permissionsByCategory).forEach(([category, permissions]) => {
      console.log(`\n📁 Catégorie ${category}:`);
      permissions.forEach(permission => {
        console.log(`  - ${permission.name} (${permission.code})`);
      });
    });

    console.log('\n✅ Initialisation des permissions par catégories terminée !');
    console.log('\nNote: Ces permissions contrôleront l\'accès aux catégories Paperasse, Administration et Gestion.');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des permissions:', error);
  } finally {
    mongoose.connection.close();
  }
};

initCategoryPermissions();
