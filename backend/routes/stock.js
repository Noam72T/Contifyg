const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const Item = require('../models/Item');
const auth = require('../middleware/auth');

// Fonction utilitaire pour calculer la semaine ISO 8601
const getCurrentWeek = () => {
  const date = new Date();
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

// GET /api/stock - Récupérer tous les stocks d'une entreprise pour la semaine courante
router.get('/', auth, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'ID de l\'entreprise requis'
      });
    }

    const currentWeek = getCurrentWeek();
    const currentYear = new Date().getFullYear();

    const stocks = await Stock.find({ 
      company: companyId,
      semaine: currentWeek,
      annee: currentYear
    })
      .populate('item', 'nom image type prixVente coutRevient')
      .populate('creePar', 'firstName lastName')
      .sort({ 'item.nom': 1 });

    res.json({
      success: true,
      stocks
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des stocks:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des stocks',
      error: error.message
    });
  }
});

// GET /api/stock/item/:itemId - Récupérer le stock d'un item spécifique pour la semaine courante
router.get('/item/:itemId', auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { companyId } = req.query;

    const currentWeek = getCurrentWeek();
    const currentYear = new Date().getFullYear();

    const stock = await Stock.findOne({ 
      item: itemId, 
      company: companyId,
      semaine: currentWeek,
      annee: currentYear
    }).populate('item', 'nom image type prixVente');

    if (!stock) {
      return res.json({
        success: true,
        stock: { quantite: 0, item: itemId }
      });
    }

    res.json({
      success: true,
      stock
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du stock:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération du stock',
      error: error.message
    });
  }
});

// POST /api/stock - Créer ou mettre à jour un stock pour la semaine courante
router.post('/', auth, async (req, res) => {
  try {
    const { itemId, companyId, quantite, quantiteMinimale, motif } = req.body;

    if (!itemId || !companyId || quantite === undefined) {
      return res.status(400).json({
        success: false,
        message: 'itemId, companyId et quantite sont requis'
      });
    }

    // Vérifier que l'item existe
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item non trouvé'
      });
    }

    const currentWeek = getCurrentWeek();
    const currentYear = new Date().getFullYear();

    // Chercher un stock existant pour la semaine courante
    let stock = await Stock.findOne({ 
      item: itemId, 
      company: companyId,
      semaine: currentWeek,
      annee: currentYear
    });
    
    if (stock) {
      // Mettre à jour le stock existant
      const quantiteAvant = stock.quantite;
      const quantiteApres = Number(quantite);
      
      stock.quantite = quantiteApres;
      if (quantiteMinimale !== undefined) {
        stock.quantiteMinimale = Number(quantiteMinimale);
      }
      
      // Ajouter à l'historique
      stock.ajouterHistorique(
        'correction',
        quantiteApres - quantiteAvant,
        quantiteAvant,
        quantiteApres,
        motif || 'Mise à jour manuelle',
        req.user.id
      );
      
      await stock.save();
    } else {
      // Créer un nouveau stock pour la semaine courante
      stock = new Stock({
        item: itemId,
        company: companyId,
        quantite: Number(quantite),
        quantiteMinimale: Number(quantiteMinimale) || 5,
        semaine: currentWeek,
        annee: currentYear,
        creePar: req.user.id
      });
      
      // Ajouter à l'historique
      stock.ajouterHistorique(
        'ajout',
        Number(quantite),
        0,
        Number(quantite),
        motif || 'Création du stock',
        req.user.id
      );
      
      await stock.save();
    }

    await stock.populate('item', 'nom image type prixVente');
    await stock.populate('creePar', 'firstName lastName');

    res.json({
      success: true,
      message: 'Stock mis à jour avec succès',
      stock
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du stock:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour du stock',
      error: error.message
    });
  }
});

// PUT /api/stock/decrement - Décrémenter le stock lors d'une vente
router.put('/decrement', auth, async (req, res) => {
  try {
    const { itemId, companyId, quantite, motif } = req.body;

    if (!itemId || !companyId || !quantite) {
      return res.status(400).json({
        success: false,
        message: 'Item ID, Company ID et quantité sont requis'
      });
    }

    const stock = await Stock.findOne({ item: itemId, company: companyId });
    
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock non trouvé pour cet item'
      });
    }

    if (stock.quantite < quantite) {
      return res.status(400).json({
        success: false,
        message: `Stock insuffisant. Disponible: ${stock.quantite}, Demandé: ${quantite}`
      });
    }

    const quantiteAvant = stock.quantite;
    const quantiteApres = quantiteAvant - Number(quantite);
    
    stock.quantite = quantiteApres;
    
    // Ajouter à l'historique
    stock.ajouterHistorique(
      'vente',
      -Number(quantite),
      quantiteAvant,
      quantiteApres,
      motif || 'Vente',
      req.user.id
    );
    
    await stock.save();
    await stock.populate('item', 'nom image type prixVente');

    res.json({
      success: true,
      message: 'Stock décrémenté avec succès',
      stock,
      nouvelleQuantite: quantiteApres
    });
  } catch (error) {
    console.error('Erreur lors de la décrémentation du stock:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la décrémentation du stock',
      error: error.message
    });
  }
});

// GET /api/stock/historique/:stockId - Récupérer l'historique d'un stock
router.get('/historique/:stockId', auth, async (req, res) => {
  try {
    const { stockId } = req.params;

    const stock = await Stock.findById(stockId)
      .populate('item', 'nom')
      .populate('historiqueStock.utilisateur', 'firstName lastName');

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock non trouvé'
      });
    }

    res.json({
      success: true,
      historique: stock.historiqueStock.sort((a, b) => new Date(b.date) - new Date(a.date))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de l\'historique',
      error: error.message
    });
  }
});

// DELETE /api/stock/:id - Supprimer un stock
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const stock = await Stock.findById(id);
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock non trouvé'
      });
    }

    await Stock.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Stock supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du stock:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression du stock',
      error: error.message
    });
  }
});

module.exports = router;
