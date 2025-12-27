const express = require('express');
const router = express.Router();
const PrestationCategory = require('../models/PrestationCategory');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Middleware pour vérifier l'accès à l'entreprise
const checkCompanyAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    const companyId = req.params.companyId || req.body.company;
    
    // Technicien a accès à tout
    if (user.systemRole === 'Technicien') {
      req.companyId = companyId;
      return next();
    }

    // Vérifier que l'utilisateur appartient à l'entreprise
    const hasAccess = user.companies.some(
      c => c.company.toString() === companyId
    );

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès refusé à cette entreprise' 
      });
    }

    req.companyId = companyId;
    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
};

// PUT /api/categories/reorder - Réorganiser l'ordre des catégories
// IMPORTANT: Cette route doit être AVANT /:companyId pour éviter que "reorder" soit interprété comme un ID
router.put('/reorder', auth, async (req, res) => {
  try {
    const { companyId, categories } = req.body;
    
    if (!companyId || !categories || !Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides'
      });
    }

    // Vérifier l'accès à l'entreprise
    const user = await User.findById(req.userId);
    const hasAccess = user.systemRole === 'Technicien' || 
                      user.companies.some(c => c.company.toString() === companyId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    // Mettre à jour l'ordre de chaque catégorie
    console.log('📋 Réorganisation des catégories:', categories);
    
    const updatePromises = categories.map(cat => {
      console.log(`  - Mise à jour catégorie ${cat.id}: order = ${cat.order}`);
      return PrestationCategory.findByIdAndUpdate(
        cat.id,
        { order: cat.order },
        { new: true }
      );
    });

    const results = await Promise.all(updatePromises);
    console.log('✅ Catégories mises à jour:', results.map(r => ({ name: r?.name, order: r?.order })));

    res.json({
      success: true,
      message: 'Ordre des catégories mis à jour'
    });
  } catch (error) {
    console.error('Erreur lors de la réorganisation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// GET /api/categories/:companyId - Obtenir toutes les catégories d'une entreprise
router.get('/:companyId', auth, checkCompanyAccess, async (req, res) => {
  try {
    const categories = await PrestationCategory.find({ 
      company: req.companyId,
      isSystemCategory: { $ne: true } // Exclure les catégories système
    })
    .populate('parentCategory', 'name')
    .sort({ order: 1, name: 1 });

    // Organiser les catégories par hiérarchie
    const mainCategories = categories.filter(cat => !cat.parentCategory);
    const categoriesWithChildren = mainCategories.map(mainCat => ({
      ...mainCat.toObject(),
      subcategories: categories.filter(cat => 
        cat.parentCategory && cat.parentCategory._id.toString() === mainCat._id.toString()
      )
    }));

    res.json({
      success: true,
      categories: categoriesWithChildren
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
});

// POST /api/categories - Créer une nouvelle catégorie
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, icon, color, company, parentCategory, customVehicleCategory } = req.body;

    // Vérifier l'accès à l'entreprise
    const user = await User.findById(req.userId);
    if (user.systemRole !== 'Technicien') {
      const hasAccess = user.companies.some(
        c => c.company.toString() === company
      );
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accès refusé à cette entreprise' 
        });
      }
    }

    // Vérifier si une catégorie avec ce nom existe déjà
    const existingCategory = await PrestationCategory.findOne({
      name,
      company,
      isSystemCategory: false
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Une catégorie avec ce nom existe déjà'
      });
    }

    const category = new PrestationCategory({
      name,
      description,
      icon: icon || 'Folder',
      color: color || '#3b82f6',
      company,
      parentCategory: parentCategory || null,
      isSystemCategory: false,
      customVehicleCategory: customVehicleCategory || null
    });

    await category.save();

    const populatedCategory = await PrestationCategory.findById(category._id)
      .populate('parentCategory', 'name');

    res.status(201).json({
      success: true,
      category: populatedCategory,
      message: 'Catégorie créée avec succès'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
});

// PUT /api/categories/:id - Modifier une catégorie
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, icon, color, customVehicleCategory } = req.body;
    
    const category = await PrestationCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: 'Catégorie non trouvée' 
      });
    }

    // Vérifier l'accès à l'entreprise
    const user = await User.findById(req.userId);
    if (user.systemRole !== 'Technicien') {
      const hasAccess = user.companies.some(
        c => c.company.toString() === category.company.toString()
      );
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accès refusé à cette entreprise' 
        });
      }
    }

    // Ne pas permettre la modification des catégories système (sauf par technicien)
    if (category.isSystemCategory && user.systemRole !== 'Technicien') {
      return res.status(403).json({ 
        success: false, 
        message: 'Impossible de modifier une catégorie système' 
      });
    }

    const updatedCategory = await PrestationCategory.findByIdAndUpdate(
      req.params.id,
      { name, description, icon, color, customVehicleCategory },
      { new: true, runValidators: true }
    ).populate('parentCategory', 'name');

    res.json({
      success: true,
      category: updatedCategory,
      message: 'Catégorie modifiée avec succès'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
});

// DELETE /api/categories/:id - Supprimer une catégorie
router.delete('/:id', auth, async (req, res) => {
  try {
    const category = await PrestationCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: 'Catégorie non trouvée' 
      });
    }

    // Vérifier l'accès à l'entreprise
    const user = await User.findById(req.userId);
    if (user.systemRole !== 'Technicien') {
      const hasAccess = user.companies.some(
        c => c.company.toString() === category.company.toString()
      );
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accès refusé à cette entreprise' 
        });
      }
    }

    // Ne pas permettre la suppression des catégories système
    if (category.isSystemCategory) {
      return res.status(403).json({ 
        success: false, 
        message: 'Impossible de supprimer une catégorie système' 
      });
    }

    // Vérifier s'il y a des sous-catégories
    const subcategories = await PrestationCategory.find({ 
      parentCategory: req.params.id 
    });
    
    if (subcategories.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Impossible de supprimer une catégorie qui contient des sous-catégories' 
      });
    }

    await PrestationCategory.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Catégorie supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur', 
      error: error.message 
    });
  }
});

module.exports = router;
