const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Charge = require('../models/Charge');
const auth = require('../middleware/auth');

// Middleware pour vérifier l'authentification sur toutes les routes
router.use(auth);

// GET - Récupérer toutes les charges d'une entreprise
router.get('/', async (req, res) => {
  try {
    const { companyId, categorie, statut, page = 1, limit = 20 } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de l\'entreprise requis' });
    }

    const filter = { company: companyId };
    if (categorie) filter.categorie = categorie;
    if (statut) filter.statut = statut;

    const charges = await Charge.find(filter)
      .populate('createdBy', 'firstName lastName username')
      .sort({ dateCharge: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Charge.countDocuments(filter);

    res.json({
      success: true,
      charges,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des charges:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET - Récupérer une charge par ID
router.get('/:id', async (req, res) => {
  try {
    const charge = await Charge.findById(req.params.id)
      .populate('company', 'name')
      .populate('createdBy', 'firstName lastName username');

    if (!charge) {
      return res.status(404).json({ message: 'Charge non trouvée' });
    }

    res.json(charge);
  } catch (error) {
    console.error('Erreur lors de la récupération de la charge:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET - Statistiques des charges par catégorie
router.get('/stats/categories', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de l\'entreprise requis' });
    }

    const stats = await Charge.aggregate([
      { $match: { company: mongoose.Types.ObjectId(companyId) } },
      {
        $group: {
          _id: '$categorie',
          total: { $sum: '$montant' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST - Créer une nouvelle charge
router.post('/', async (req, res) => {
  try {
    
    
    // Nettoyer et valider les données
    const chargeData = {
      company: req.body.company,
      nom: req.body.nom,
      description: req.body.description || '',
      montant: parseFloat(req.body.montant),
      categorie: req.body.categorie,
      dateCharge: new Date(req.body.dateCharge),
      recurrente: Boolean(req.body.recurrente),
      statut: req.body.statut || 'en_attente',
      deductibilite: req.body.deductibilite || 'deductible',
      createdBy: req.user._id
    };

    // Ajouter la fréquence si récurrente et non vide
    if (chargeData.recurrente && req.body.frequence && req.body.frequence.trim() !== '') {
      chargeData.frequence = req.body.frequence;
    }

    // Ajouter le pourcentage de déduction si partiellement déductible
    if (chargeData.deductibilite === 'partiellement_deductible' && req.body.pourcentageDeduction) {
      chargeData.pourcentageDeduction = parseFloat(req.body.pourcentageDeduction);
    }

    // Ajouter les informations de facture si présentes
    if (req.body.facture && (req.body.facture.numero || req.body.facture.fournisseur || req.body.facture.dateEcheance)) {
      chargeData.facture = {};
      if (req.body.facture.numero) chargeData.facture.numero = req.body.facture.numero;
      if (req.body.facture.fournisseur) chargeData.facture.fournisseur = req.body.facture.fournisseur;
      if (req.body.facture.dateEcheance) chargeData.facture.dateEcheance = new Date(req.body.facture.dateEcheance);
    }

    

    const charge = new Charge(chargeData);
    await charge.save();

    const populatedCharge = await Charge.findById(charge._id)
      .populate('company', 'name')
      .populate('createdBy', 'firstName lastName username');

    res.status(201).json({ success: true, charge: populatedCharge });
  } catch (error) {
    console.error('Erreur lors de la création de la charge:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : null
    });
  }
});

// PUT - Mettre à jour une charge
router.put('/:id', async (req, res) => {
  try {
    // Nettoyer les données avant la mise à jour
    const updateData = { ...req.body };
    
    // Si frequence est une chaîne vide et que recurrente est false, supprimer frequence
    if (updateData.frequence === '' && !updateData.recurrente) {
      delete updateData.frequence;
    }
    
    // Si recurrente est false, supprimer frequence
    if (updateData.recurrente === false) {
      delete updateData.frequence;
    }

    const charge = await Charge.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('company', 'name')
     .populate('createdBy', 'firstName lastName username');

    if (!charge) {
      return res.status(404).json({ message: 'Charge non trouvée' });
    }

    res.json(charge);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la charge:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// DELETE - Supprimer une charge
router.delete('/:id', async (req, res) => {
  try {
    const charge = await Charge.findByIdAndDelete(req.params.id);

    if (!charge) {
      return res.status(404).json({ message: 'Charge non trouvée' });
    }

    res.json({ success: true, message: 'Charge supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la charge:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;
