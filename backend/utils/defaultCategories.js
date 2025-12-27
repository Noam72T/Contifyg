const PrestationCategory = require('../models/PrestationCategory');

// Fonction pour créer les catégories par défaut pour une nouvelle entreprise
const createDefaultCategories = async (companyId) => {
  try {
    console.log(`Création des catégories par défaut pour l'entreprise ${companyId}`);

    // Définition des catégories par défaut
    const defaultCategories = [
      // Paperasse
      {
        name: 'Paperasse',
        description: 'Documents administratifs et comptables',
        icon: 'FileText',
        color: '#ef4444',
        isSystemCategory: true,
        order: 1,
        subcategories: [
          { name: 'Bilan', description: 'Bilans comptables', icon: 'BarChart3', order: 1 },
          { name: 'Charges', description: 'Gestion des charges', icon: 'TrendingDown', order: 2 },
          { name: 'Factures', description: 'Factures clients et fournisseurs', icon: 'Receipt', order: 3 }
        ]
      },
      // Administration
      {
        name: 'Administration',
        description: 'Gestion administrative de l\'entreprise',
        icon: 'Users',
        color: '#3b82f6',
        isSystemCategory: true,
        order: 2,
        subcategories: [
          { name: 'Listes des employés', description: 'Gestion du personnel', icon: 'UserCheck', order: 1 },
          { name: 'Listes des ventes', description: 'Historique des ventes', icon: 'ShoppingCart', order: 2 },
          { name: 'Listes des Salaires', description: 'Gestion des salaires', icon: 'Banknote', order: 3 },
          { name: 'Listes des factures', description: 'Gestion des factures', icon: 'FileText', order: 4 }
        ]
      },
      // Gestion
      {
        name: 'Gestion',
        description: 'Outils de gestion avancée',
        icon: 'Settings',
        color: '#10b981',
        isSystemCategory: true,
        order: 3,
        subcategories: [
          { name: 'Gestion Roles', description: 'Gestion des rôles et permissions', icon: 'Shield', order: 1 },
          { name: 'Gestion Item', description: 'Gestion des articles et produits', icon: 'Package', order: 2 },
          { name: 'Gestionnaire Partenariat', description: 'Gestion des partenaires', icon: 'Handshake', order: 3 },
          { name: 'Gestion Entreprise', description: 'Paramètres de l\'entreprise', icon: 'Building', order: 4 }
        ]
      }
    ];

    // Créer les catégories principales et leurs sous-catégories
    for (const categoryData of defaultCategories) {
      // Créer la catégorie principale
      const mainCategory = new PrestationCategory({
        name: categoryData.name,
        description: categoryData.description,
        icon: categoryData.icon,
        color: categoryData.color,
        company: companyId,
        isSystemCategory: categoryData.isSystemCategory,
        order: categoryData.order
      });

      await mainCategory.save();
      console.log(`Catégorie principale créée: ${categoryData.name}`);

      // Créer les sous-catégories
      for (const subcategoryData of categoryData.subcategories) {
        const subcategory = new PrestationCategory({
          name: subcategoryData.name,
          description: subcategoryData.description,
          icon: subcategoryData.icon,
          color: categoryData.color, // Hérite de la couleur parent
          company: companyId,
          parentCategory: mainCategory._id,
          isSystemCategory: true,
          order: subcategoryData.order
        });

        await subcategory.save();
        console.log(`Sous-catégorie créée: ${subcategoryData.name}`);
      }
    }

    console.log('Catégories par défaut créées avec succès');
    return true;
  } catch (error) {
    console.error('Erreur lors de la création des catégories par défaut:', error);
    throw error;
  }
};

module.exports = {
  createDefaultCategories
};
