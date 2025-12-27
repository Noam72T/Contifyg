const express = require('express');
const router = express.Router();
const Prestation = require('../models/Prestation');
const PrestationCategory = require('../models/PrestationCategory');
const User = require('../models/User'); // Ajout pour l'optimisation
const auth = require('../middleware/auth');

// OPTIMISÉ: Obtenir toutes les prestations d'une entreprise avec pagination
router.get('/', auth, async (req, res) => {
  try {
    const { company, page = 1, limit = 100, category, search } = req.query;
    const skip = (page - 1) * limit;
    
    // Construire la requête de base
    let query = { isActive: true };
    
    if (!company || company === 'null') {
      query.company = null; // Prestations template
    } else {
      query.company = company;
    }
    
    // Filtres optionnels
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // OPTIMISATION: Compter et récupérer en parallèle
    const [total, prestations] = await Promise.all([
      Prestation.countDocuments(query),
      Prestation.find(query)
        .select('name description price category icon partner company createdBy createdAt')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ category: 1, name: 1 })
        .lean() // LEAN pour performance
    ]);
    
    // OPTIMISATION: Récupérer les créateurs en une seule requête
    if (prestations.length > 0) {
      const creatorIds = [...new Set(prestations.map(p => p.createdBy).filter(Boolean))];
      const creators = await User.find({ _id: { $in: creatorIds } })
        .select('username firstName lastName')
        .lean();
      
      // Mapper les créateurs aux prestations
      prestations.forEach(prestation => {
        if (prestation.createdBy) {
          const creator = creators.find(c => c._id.toString() === prestation.createdBy.toString());
          prestation.createdBy = creator ? {
            _id: creator._id,
            name: creator.username || `${creator.firstName} ${creator.lastName}`
          } : null;
        }
      });
    }

    res.json({
      success: true,
      prestations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching prestations:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des prestations' });
  }
});

// Créer une nouvelle prestation
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, price, category, icon, partner, company } = req.body;

    if (!name || !description || !price || !category || !company) {
      return res.status(400).json({ 
        error: 'Tous les champs requis doivent être remplis' 
      });
    }

    const prestation = new Prestation({
      name,
      description,
      price,
      category,
      icon: icon || 'Wrench',
      partner,
      company,
      createdBy: req.user.id
    });

    await prestation.save();
    await prestation.populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      prestation
    });
  } catch (error) {
    console.error('Error creating prestation:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création de la prestation' });
  }
});

// Mettre à jour une prestation
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, icon, partner } = req.body;

    const prestation = await Prestation.findById(id);

    if (!prestation) {
      return res.status(404).json({ error: 'Prestation non trouvée' });
    }

    // Vérifier que l'utilisateur peut modifier cette prestation
    // (même entreprise ou admin)
    if (prestation.company.toString() !== req.user.company?.toString()) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    prestation.name = name || prestation.name;
    prestation.description = description || prestation.description;
    prestation.price = price || prestation.price;
    prestation.category = category || prestation.category;
    prestation.icon = icon || prestation.icon;
    prestation.partner = partner || prestation.partner;

    await prestation.save();
    await prestation.populate('createdBy', 'name');

    res.json({
      success: true,
      prestation
    });
  } catch (error) {
    console.error('Error updating prestation:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de la prestation' });
  }
});

// Supprimer une prestation (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const prestation = await Prestation.findById(id);

    if (!prestation) {
      return res.status(404).json({ error: 'Prestation non trouvée' });
    }

    // Vérifier que l'utilisateur peut supprimer cette prestation
    if (prestation.company.toString() !== req.user.company?.toString()) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    prestation.isActive = false;
    await prestation.save();

    res.json({
      success: true,
      message: 'Prestation supprimée avec succès'
    });
  } catch (error) {
    console.error('Error deleting prestation:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression de la prestation' });
  }
});

// Routes pour les catégories personnalisées
// GET - Récupérer toutes les catégories d'une entreprise
router.get('/categories/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { type } = req.query; // Nouveau paramètre pour filtrer par type
    
    let filter = { 
      company: companyId,
      isActive: true 
    };

    // Si type=product, exclure les catégories système de navigation
    if (type === 'product') {
      // Exclure les catégories qui sont clairement des éléments de navigation
      const navigationCategories = [
        'Gestion Roles', 'Listes des employés', 'Paperasse', 'Administration',
        'Charges', 'Gestion Item', 'Listes des ventes', 'Factures', 'Gestion',
        'Gestionnaire Partenariat', 'Listes des Salaires', 'Gestion Entreprise',
        'Listes des factures', 'Bilan'
      ];
      
      filter.name = { $nin: navigationCategories };
      // Ou alternativement, ne récupérer que les catégories qui ne sont pas des catégories système
      // filter.isSystemCategory = { $ne: true };
    }
    
    const categories = await PrestationCategory.find(filter).sort({ order: 1, name: 1 });

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des catégories' });
  }
});

// POST - Créer une nouvelle catégorie
router.post('/categories', auth, async (req, res) => {
  try {
    const { name, description, icon, color, company, order } = req.body;

    if (!name || !company) {
      return res.status(400).json({ 
        error: 'Le nom et l\'entreprise sont requis' 
      });
    }

    // Vérifier les permissions pour créer une catégorie
    const User = require('../models/User');
    const user = await User.findById(req.user.id).populate('companies.role');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Techniciens ont accès complet
    if (user.systemRole === 'Technicien') {
     
    } else {
      // Vérifier les permissions
      const hasPermission = await checkUserPermission(user, req.body.company, ['CREATE_PRESTATION_CATEGORIES']);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Permission insuffisante pour créer des catégories de prestations'
        });
      }
    }

    // Vérifier si une catégorie avec ce nom existe déjà pour cette entreprise
    const existingCategory = await PrestationCategory.findOne({ 
      name, 
      company,
      isActive: true 
    });

    if (existingCategory) {
      return res.status(400).json({ 
        error: 'Une catégorie avec ce nom existe déjà' 
      });
    }

    const category = new PrestationCategory({
      name,
      description: description || '',
      icon: icon || 'Folder',
      color: color || '#3b82f6',
      company,
      order: order || 0
    });

    await category.save();

    res.status(201).json({
      success: true,
      category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création de la catégorie' });
  }
});

// PUT - Mettre à jour une catégorie
router.put('/categories/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, order } = req.body;

    const category = await PrestationCategory.findById(id);

    if (!category) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    // Vérifier les permissions - seuls les utilisateurs avec MANAGE_PRESTATIONS ou Techniciens peuvent modifier des catégories
    const User = require('../models/User');
    const user = await User.findById(req.user.id)
      .populate({
        path: 'companies.role',
        model: 'Role',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });

    // Vérifier si l'utilisateur est Technicien (accès complet)
    if (user.systemRole !== 'Technicien') {
      // Trouver l'entreprise de l'utilisateur
      const userCompany = user.companies.find(c => c.company.toString() === category.company.toString());
      
      if (!userCompany) {
        return res.status(403).json({ 
          error: 'Vous n\'appartenez pas à cette entreprise' 
        });
      }

      const role = userCompany.role;
      if (!role || !role.permissions) {
        return res.status(403).json({ 
          error: 'Aucun rôle ou permission défini' 
        });
      }

      // Vérifier si l'utilisateur a la permission MANAGE_PRESTATIONS
      const hasPermission = role.permissions.some(permission => 
        permission.code === 'MANAGE_PRESTATIONS' || 
        permission.code === 'GESTION_MANAGE'
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Permission insuffisante. Vous devez avoir la permission MANAGE_PRESTATIONS pour modifier des catégories.' 
        });
      }
    }

    category.name = name || category.name;
    category.description = description || category.description;
    category.icon = icon || category.icon;
    category.color = color || category.color;
    category.order = order !== undefined ? order : category.order;

    await category.save();

    res.json({
      success: true,
      category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de la catégorie' });
  }
});

// DELETE - Supprimer une catégorie
router.delete('/categories/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const category = await PrestationCategory.findById(id);

    if (!category) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    // Vérifier les permissions - seuls les utilisateurs avec MANAGE_PRESTATIONS ou Techniciens peuvent supprimer des catégories
    const User = require('../models/User');
    const user = await User.findById(req.user.id)
      .populate({
        path: 'companies.role',
        model: 'Role',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });

    // Vérifier si l'utilisateur est Technicien (accès complet)
    if (user.systemRole !== 'Technicien') {
      // Trouver l'entreprise de l'utilisateur
      const userCompany = user.companies.find(c => c.company.toString() === category.company.toString());
      
      if (!userCompany) {
        return res.status(403).json({ 
          error: 'Vous n\'appartenez pas à cette entreprise' 
        });
      }

      const role = userCompany.role;
      if (!role || !role.permissions) {
        return res.status(403).json({ 
          error: 'Aucun rôle ou permission défini' 
        });
      }

      // Vérifier si l'utilisateur a la permission MANAGE_PRESTATIONS
      const hasPermission = role.permissions.some(permission => 
        permission.code === 'MANAGE_PRESTATIONS' || 
        permission.code === 'GESTION_MANAGE'
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Permission insuffisante. Vous devez avoir la permission MANAGE_PRESTATIONS pour supprimer des catégories.' 
        });
      }
    }

    // Vérifier s'il y a des prestations liées à cette catégorie
    const prestationsCount = await Prestation.countDocuments({ 
      category: category.name,
      company: category.company,
      isActive: true 
    });

    if (prestationsCount > 0) {
      return res.status(400).json({ 
        error: `Impossible de supprimer cette catégorie car ${prestationsCount} prestation(s) y sont liées` 
      });
    }

    category.isActive = false;
    await category.save();

    res.json({
      success: true,
      message: 'Catégorie supprimée avec succès'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression de la catégorie' });
  }
});

// Route pour créer des catégories de produits par défaut
router.post('/categories/:companyId/create-product-categories', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    // Vérifier si des catégories de produits existent déjà
    const existingProductCategories = await PrestationCategory.find({
      company: companyId,
      isActive: true,
      isSystemCategory: false
    });

    if (existingProductCategories.length > 0) {
      return res.json({
        success: true,
        message: 'Des catégories de produits existent déjà',
        categories: existingProductCategories
      });
    }

    // Créer des catégories de produits par défaut
    const defaultProductCategories = [
      {
        name: 'Électronique',
        description: 'Produits électroniques et high-tech',
        icon: 'Smartphone',
        color: '#3b82f6'
      },
      {
        name: 'Vêtements',
        description: 'Articles vestimentaires',
        icon: 'Shirt',
        color: '#10b981'
      },
      {
        name: 'Alimentation',
        description: 'Produits alimentaires',
        icon: 'Apple',
        color: '#f59e0b'
      },
      {
        name: 'Services',
        description: 'Prestations de services',
        icon: 'Wrench',
        color: '#8b5cf6'
      },
      {
        name: 'Autre',
        description: 'Autres produits',
        icon: 'Package',
        color: '#6b7280'
      }
    ];

    const createdCategories = [];
    for (let i = 0; i < defaultProductCategories.length; i++) {
      const categoryData = defaultProductCategories[i];
      const category = new PrestationCategory({
        name: categoryData.name,
        description: categoryData.description,
        icon: categoryData.icon,
        color: categoryData.color,
        company: companyId,
        isSystemCategory: false, // Ce ne sont pas des catégories système
        order: i + 1
      });

      await category.save();
      createdCategories.push(category);
    }

    res.json({
      success: true,
      message: 'Catégories de produits créées avec succès',
      categories: createdCategories
    });
  } catch (error) {
    console.error('Error creating product categories:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création des catégories de produits' });
  }
});

module.exports = router;
