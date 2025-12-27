const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/items - Récupérer tous les items avec filtrage par entreprise
router.get('/', auth, async (req, res) => {
  try {
    const { companyId } = req.query;
    
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    
    let items = await Item.find()
      .populate('company', 'name')
      .populate('creePar', 'firstName lastName')
      .sort({ nom: 1 });

    
    
    // Log de tous les items pour debug
    items.forEach((item, index) => {
      
    });

    // Filtrer par entreprise si companyId est fourni dans la query
    if (companyId) {
      
      const originalCount = items.length;
      items = items.filter(item => {
        const match = item.company && item.company._id.toString() === companyId;
        if (match) {
         
        }
        return match;
      });
      
    }

    // Formater la réponse
    const itemsData = items.map(item => ({
      _id: item._id,
      nom: item.nom,
      image: item.image,
      type: item.type,
      sousType: item.sousType,
      prixVente: item.prixVente,
      coutRevient: item.coutRevient,
      margeBrute: item.margeBrute,
      categorie: item.categorie,
      gestionStock: item.gestionStock || false,
      customCategory: item.customCategory,
      company: item.company,
      creePar: item.creePar,
      dateCreation: item.dateCreation,
      dateModification: item.dateModification
    }));

    
    res.json(itemsData);
  } catch (error) {
    console.error('Erreur lors de la récupération des items:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors de la récupération des items',
      error: error.message 
    });
  }
});

// POST /api/items - Créer un nouvel item
router.post('/', auth, async (req, res) => {
  try {
    
    
    const { nom, image, type, sousType, prixVente, coutRevient, categorie, companyId, gestionStock, customCategory } = req.body;
    
    // Validation des champs requis
    if (!nom || !type || prixVente === undefined || coutRevient === undefined || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs requis doivent être fournis'
      });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Calculer la marge brute
    const prixVenteNum = Number(prixVente);
    const coutRevientNum = Number(coutRevient);
    const margeBrute = coutRevientNum === 0 ? prixVenteNum : prixVenteNum - coutRevientNum;
    
    // S'assurer que type est un tableau
    const typeArray = Array.isArray(type) ? type : [type];
    
    // Créer le nouvel item
    const newItem = new Item({
      nom,
      image: image || '',
      type: typeArray,
      sousType: sousType || 'Inconnu',
      prixVente: prixVenteNum,
      coutRevient: coutRevientNum,
      margeBrute: margeBrute,
      categorie: categorie ? Number(categorie) : null,
      gestionStock: gestionStock || false,
      customCategory: customCategory || '',
      company: companyId,
      creePar: req.user.id
    });
    
    const savedItem = await newItem.save();
    await savedItem.populate('company', 'name');
    await savedItem.populate('creePar', 'firstName lastName');
    
   
    res.status(201).json({
      success: true,
      message: 'Item créé avec succès',
      item: savedItem
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'item:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de l\'item',
      error: error.message
    });
  }
});


// DELETE /api/items/:id - Supprimer un item
router.delete('/:id', auth, async (req, res) => {
  try {
   
    
    const itemId = req.params.id;
    
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item non trouvé'
      });
    }
    
    await Item.findByIdAndDelete(itemId);
    
   
    res.json({
      success: true,
      message: 'Item supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'item:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression de l\'item',
      error: error.message
    });
  }
});

// PUT /api/items/:id - Modifier un item existant
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, image, type, sousType, prixVente, coutRevient, categorie, gestionStock, customCategory } = req.body;
    
    console.log(`🔄 Modification item ${id}:`);
    console.log(`  - gestionStock reçu:`, gestionStock);
    console.log(`  - Type de gestionStock:`, typeof gestionStock);
    
    // Vérifier que l'item existe
    const existingItem = await Item.findById(id);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Item non trouvé'
      });
    }
    
    console.log(`  - gestionStock avant:`, existingItem.gestionStock);
    
    // Calculer la marge brute
    const prixVenteNum = Number(prixVente);
    const coutRevientNum = Number(coutRevient);
    const margeBrute = coutRevientNum === 0 ? prixVenteNum : prixVenteNum - coutRevientNum;
    
    console.log(`💰 Calcul marge brute: ${prixVenteNum} - ${coutRevientNum} = ${margeBrute}`);
    
    // S'assurer que type est un tableau
    const typeArray = Array.isArray(type) ? type : [type];
    
    // Mettre à jour l'item
    const updatedItem = await Item.findByIdAndUpdate(
      id,
      {
        nom,
        image,
        type: typeArray,
        sousType,
        prixVente: prixVenteNum,
        coutRevient: coutRevientNum,
        margeBrute: margeBrute,
        categorie: categorie ? Number(categorie) : null,
        gestionStock: gestionStock !== undefined ? gestionStock : false,
        customCategory: customCategory || '',
        dateModification: Date.now()
      },
      { new: true }
    ).populate('company', 'name').populate('creePar', 'firstName lastName');
    
    console.log(`✅ Item modifié: ${updatedItem.nom}`);
    console.log(`  - gestionStock après:`, updatedItem.gestionStock);
    
    res.json({
      success: true,
      message: 'Item modifié avec succès',
      item: updatedItem
    });
  } catch (error) {
    console.error('Erreur lors de la modification de l\'item:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la modification de l\'item',
      error: error.message
    });
  }
});

// Route temporaire pour initialiser gestionStock sur tous les items existants
router.post('/init-gestion-stock', auth, async (req, res) => {
  try {
    console.log('🔄 Initialisation du champ gestionStock pour tous les items...');
    
    // Mettre à jour tous les items qui n'ont pas le champ gestionStock défini
    const result = await Item.updateMany(
      {
        $or: [
          { gestionStock: { $exists: false } },
          { gestionStock: null }
        ]
      },
      {
        $set: { gestionStock: false }
      }
    );
    
    console.log(`✅ ${result.modifiedCount} items mis à jour avec gestionStock: false`);
    
    // Récupérer tous les items pour vérification
    const allItems = await Item.find({}).select('nom gestionStock');
    console.log('📋 État des items après mise à jour:');
    allItems.forEach(item => {
      console.log(`  - ${item.nom}: gestionStock = ${item.gestionStock}`);
    });
    
    res.json({
      success: true,
      message: `${result.modifiedCount} items initialisés avec gestionStock: false`,
      modifiedCount: result.modifiedCount,
      totalItems: allItems.length
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'initialisation des items',
      error: error.message
    });
  }
});

module.exports = router;
