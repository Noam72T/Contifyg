const express = require('express');
const router = express.Router();
const TimerPrestation = require('../models/TimerPrestation');
const TimerSession = require('../models/TimerSession');
const Vehicle = require('../models/Vehicle');
const TimerPermission = require('../models/TimerPermission');
const Vente = require('../models/Vente');
const auth = require('../middleware/auth');

// Fonctions utilitaires pour le calcul des semaines
const getStartOfWeek = (year, week) => {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOweekStart;
};

const getEndOfWeek = (year, week) => {
  const startOfWeek = getStartOfWeek(year, week);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
};

// Middleware pour vérifier les permissions timer
const checkTimerPermissions = async (req, res, next) => {
  try {
    // Les Techniciens ont toujours accès
    if (req.user.systemRole === 'Technicien') {
      return next();
    }
    
    // Pour les autres, vérifier les permissions de l'entreprise
    // Essayer plusieurs sources pour récupérer le companyId
    const companyId = req.params.companyId || 
                     req.body.company || 
                     req.user.company || 
                     req.user.currentCompany;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'ID d\'entreprise requis'
      });
    }
    
    const isAuthorized = await TimerPermission.isCompanyAuthorized(companyId);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Votre entreprise n\'est pas autorisée à utiliser les timers. Contactez un Technicien.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Erreur lors de la vérification des permissions timer:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la vérification des permissions'
    });
  }
};

// Route pour récupérer l'historique des sessions terminées
router.get('/sessions/history/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      date, 
      week, 
      vehicle, 
      employee, 
      search,
      sort = 'date-desc'
    } = req.query;
    
    // Construire le filtre
    const filter = {
      company: companyId,
      statut: { $in: ['termine', 'annule'] }
    };
    
    // Filtrer par statut si spécifié
    if (status && status !== 'all') {
      filter.statut = status;
    }
    
    // Filtrer par véhicule si spécifié
    if (vehicle && vehicle !== 'all') {
      filter.vehicle = vehicle;
    }
    
    // Filtrer par employé si spécifié
    if (employee && employee !== 'all') {
      filter.utilisateur = employee;
    }
    
    // Filtrer par date spécifique
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      filter.createdAt = {
        $gte: startDate,
        $lt: endDate
      };
    }
    
    // Filtrer par semaine (format: YYYY-WW ou YYYY_WW)
    if (week) {
      let weekStart, weekEnd;
      
      if (week.includes('_')) {
        // Format ancien: date_start_date_end
        [weekStart, weekEnd] = week.split('_');
        filter.createdAt = {
          $gte: new Date(weekStart),
          $lte: new Date(weekEnd + 'T23:59:59.999Z')
        };
      } else if (week.includes('-')) {
        // Format nouveau: YYYY-WW
        const [year, weekNum] = week.split('-');
        const startOfWeek = getStartOfWeek(parseInt(year), parseInt(weekNum));
        const endOfWeek = getEndOfWeek(parseInt(year), parseInt(weekNum));
        
        filter.createdAt = {
          $gte: startOfWeek,
          $lte: endOfWeek
        };
      }
    }
    
    // Construire la requête de base
    let query = TimerSession.find(filter)
      .populate('vehicle', 'nom marque modele image tarifParMinute')
      .populate('utilisateur', 'username nom prenom');
    
    // Ajouter la recherche textuelle si spécifiée
    if (search) {
      // Recherche dans les véhicules via populate
      const vehicleFilter = {
        $or: [
          { 'vehicle.nom': { $regex: search, $options: 'i' } },
          { 'vehicle.marque': { $regex: search, $options: 'i' } },
          { 'vehicle.modele': { $regex: search, $options: 'i' } }
        ]
      };
      
      // Trouver d'abord les véhicules correspondants
      const matchingVehicles = await Vehicle.find({
        company: companyId,
        $or: [
          { nom: { $regex: search, $options: 'i' } },
          { marque: { $regex: search, $options: 'i' } },
          { modele: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      if (matchingVehicles.length > 0) {
        filter.vehicle = { $in: matchingVehicles.map(v => v._id) };
      } else {
        // Aucun véhicule trouvé, retourner résultat vide
        return res.json({
          success: true,
          sessions: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }
      
      query = TimerSession.find(filter)
        .populate('vehicle', 'nom marque modele image tarifParMinute')
        .populate('utilisateur', 'username nom prenom');
    }
    
    // Appliquer le tri
    const [sortField, sortOrder] = sort.split('-');
    const sortObj = {};
    
    switch (sortField) {
      case 'date':
        sortObj.createdAt = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'duration':
        sortObj.dureeMinutes = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'cost':
        sortObj.coutTotal = sortOrder === 'asc' ? 1 : -1;
        break;
      default:
        sortObj.createdAt = -1;
    }
    
    // Récupérer les sessions avec pagination
    const sessions = await query
      .sort(sortObj)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    // Compter le total pour la pagination
    const total = await TimerSession.countDocuments(filter);
    
    res.json({
      success: true,
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// Fonction pour créer automatiquement une vente
const createAutoSale = async (session, utilisateur, companyId) => {
  try {
    // Vérifier si l'auto-création est activée pour cette entreprise
    const permissions = await TimerPermission.getCompanyPermissions(companyId);
    if (!permissions || !permissions.features.autoCreateSales) {
      
      return null;
    }

    // Récupérer les infos de l'entreprise pour le numéro de commande
    const Company = require('../models/Company');
    const companyInfo = await Company.findById(companyId);
    if (!companyInfo) {
      console.error('❌ Entreprise non trouvée pour l\'auto-création de vente');
      return null;
    }

    // Générer le numéro de commande (format: XXX-YYYYMMDD-NNNN)
    const companyPrefix = companyInfo.name.substring(0, 3).toUpperCase();
    const today = new Date();
    const dateStr = today.getFullYear() + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + 
                   today.getDate().toString().padStart(2, '0');
    
    const prefixPattern = `^${companyPrefix}-${dateStr}-`;
    const existingVentes = await Vente.find({ 
      company: companyId,
      numeroCommande: { $regex: prefixPattern }
    }).sort({ numeroCommande: -1 });
    
    let nextNumber = 1;
    if (existingVentes.length > 0) {
      const highestNumbers = existingVentes.map(v => {
        const match = v.numeroCommande.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      });
      const maxNumber = Math.max(...highestNumbers);
      nextNumber = maxNumber + 1;
    }
    
    const numeroCommande = `${companyPrefix}-${dateStr}-${nextNumber.toString().padStart(4, '0')}`;
    
    // Préparer les données de la prestation
    let prestationData;
    if (session.vehicle) {
      await session.populate('vehicle');
      prestationData = {
        prestationId: session.vehicle._id,
        nom: session.vehicle.nom,
        quantite: 1,
        prixUnitaire: session.coutCalcule,
        prixUsine: 0, // Les timers n'ont pas de coût d'usine
        commission: session.coutCalcule, // Toute la somme est de la commission
        total: session.coutCalcule,
        categorie: 'Timer - Véhicule'
      };
    } else if (session.timerPrestation) {
      await session.populate('timerPrestation');
      prestationData = {
        prestationId: session.timerPrestation._id,
        nom: session.timerPrestation.nom,
        quantite: 1,
        prixUnitaire: session.coutCalcule,
        prixUsine: 0,
        commission: session.coutCalcule,
        total: session.coutCalcule,
        categorie: 'Timer - Prestation'
      };
    }
    
    // Créer la vente avec tous les champs requis
    const vente = new Vente({
      company: companyId,
      numeroCommande: numeroCommande,
      plaque: session.vehicle ? session.vehicle.plaque : '',
      prestations: [prestationData],
      sousTotal: session.coutCalcule,
      totalCommission: session.coutCalcule,
      totalPrixUsine: 0,
      montantTotal: session.coutCalcule,
      vendeur: utilisateur._id,
      vendeurNom: `${utilisateur.firstName || ''} ${utilisateur.lastName || ''}`.trim() || utilisateur.username,
      partenariat: session.partenariat || 'Aucun partenaire',
      notes: `Vente automatique - Session timer terminée le ${new Date().toLocaleString('fr-FR')} - Durée: ${session.dureeMinutes} minutes`
    });
    
    await vente.save();
    
    // Mettre à jour les statistiques de permissions
    if (permissions) {
      await permissions.updateStats(1, session.coutCalcule);
    }
    
  
    return vente;
    
  } catch (error) {
    console.error('❌ Erreur lors de la création automatique de vente:', error);
    return null;
  }
};

// Récupérer toutes les prestations timer d'une entreprise
router.get('/prestations/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const prestations = await TimerPrestation.find({
      company: companyId,
      isActive: true
    }).sort({ ordre: 1, nom: 1 });
    
    res.json({
      success: true,
      prestations
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des prestations timer:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des prestations timer'
    });
  }
});

// Créer une nouvelle prestation timer
router.post('/prestations', auth, async (req, res) => {
  try {
    const { nom, description, tarifParMinute, couleur, icone, company } = req.body;
    
    // Validation
    if (!nom || !tarifParMinute || !company) {
      return res.status(400).json({
        success: false,
        error: 'Nom, tarif par minute et entreprise sont requis'
      });
    }
    
    if (tarifParMinute < 0) {
      return res.status(400).json({
        success: false,
        error: 'Le tarif par minute ne peut pas être négatif'
      });
    }
    
    // Vérifier si le nom existe déjà pour cette entreprise
    const existingPrestation = await TimerPrestation.findOne({
      nom: nom.trim(),
      company,
      isActive: true
    });
    
    if (existingPrestation) {
      return res.status(400).json({
        success: false,
        error: 'Une prestation timer avec ce nom existe déjà'
      });
    }
    
    const prestation = new TimerPrestation({
      nom: nom.trim(),
      description: description?.trim(),
      tarifParMinute,
      couleur: couleur || '#3b82f6',
      icone: icone || 'Timer',
      company
    });
    
    await prestation.save();
    
    res.status(201).json({
      success: true,
      prestation
    });
  } catch (error) {
    console.error('Erreur lors de la création de la prestation timer:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la création de la prestation timer'
    });
  }
});

// Modifier une prestation timer
router.put('/prestations/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, tarifParMinute, couleur, icone } = req.body;
    
    const prestation = await TimerPrestation.findById(id);
    if (!prestation) {
      return res.status(404).json({
        success: false,
        error: 'Prestation timer non trouvée'
      });
    }
    
    // Validation
    if (tarifParMinute !== undefined && tarifParMinute < 0) {
      return res.status(400).json({
        success: false,
        error: 'Le tarif par minute ne peut pas être négatif'
      });
    }
    
    // Vérifier l'unicité du nom si modifié
    if (nom && nom.trim() !== prestation.nom) {
      const existingPrestation = await TimerPrestation.findOne({
        nom: nom.trim(),
        company: prestation.company,
        isActive: true,
        _id: { $ne: id }
      });
      
      if (existingPrestation) {
        return res.status(400).json({
          success: false,
          error: 'Une prestation timer avec ce nom existe déjà'
        });
      }
    }
    
    // Mise à jour
    if (nom) prestation.nom = nom.trim();
    if (description !== undefined) prestation.description = description.trim();
    if (tarifParMinute !== undefined) prestation.tarifParMinute = tarifParMinute;
    if (couleur) prestation.couleur = couleur;
    if (icone) prestation.icone = icone;
    
    await prestation.save();
    
    res.json({
      success: true,
      prestation
    });
  } catch (error) {
    console.error('Erreur lors de la modification de la prestation timer:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la modification de la prestation timer'
    });
  }
});

// Supprimer une prestation timer
router.delete('/prestations/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const prestation = await TimerPrestation.findById(id);
    if (!prestation) {
      return res.status(404).json({
        success: false,
        error: 'Prestation timer non trouvée'
      });
    }
    
    // Vérifier s'il y a des sessions actives
    const sessionsActives = await TimerSession.countDocuments({
      timerPrestation: id,
      statut: 'en_cours'
    });
    
    if (sessionsActives > 0) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de supprimer une prestation avec des sessions actives'
      });
    }
    
    // Soft delete
    prestation.isActive = false;
    await prestation.save();
    
    res.json({
      success: true,
      message: 'Prestation timer supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la prestation timer:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la suppression de la prestation timer'
    });
  }
});

// Démarrer une session timer
router.post('/sessions/start', auth, async (req, res) => {
  try {
    const { timerPrestationId, vehicleId, vehiculePlaque, vehiculeInfo, partenariat, notes, companyId } = req.body;
    
    // Support pour les deux modes : ancien (prestations) et nouveau (véhicules)
    let vehicle = null;
    let tarifParMinute = 0;
    let finalCompanyId = companyId; // Utiliser le companyId envoyé depuis le frontend
    
    if (vehicleId) {
      // Nouveau mode avec véhicules
      vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle || !vehicle.isActive) {
        return res.status(404).json({
          success: false,
          error: 'Véhicule non trouvé ou inactif'
        });
      }
      tarifParMinute = vehicle.tarifParMinute;
      // Utiliser le companyId du véhicule comme fallback si pas fourni
      if (!finalCompanyId) {
        finalCompanyId = vehicle.company;
      }
    } else if (timerPrestationId) {
      // Ancien mode avec prestations timer
      const prestation = await TimerPrestation.findById(timerPrestationId);
      if (!prestation || !prestation.isActive) {
        return res.status(404).json({
          success: false,
          error: 'Prestation timer non trouvée ou inactive'
        });
      }
      tarifParMinute = prestation.tarifParMinute;
      // Utiliser le companyId de la prestation comme fallback si pas fourni
      if (!finalCompanyId) {
        finalCompanyId = prestation.company;
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'ID de véhicule ou de prestation timer requis'
      });
    }
    
    // Vérifier que nous avons un companyId valide
    if (!finalCompanyId) {
      return res.status(400).json({
        success: false,
        error: 'ID entreprise manquant'
      });
    }
    
    // Vérifier qu'il n'y a pas déjà une session active
    let sessionActive = null;
    if (vehicleId) {
      // Pour les véhicules, vérifier par véhicule
      sessionActive = await TimerSession.findOne({
        vehicle: vehicleId,
        statut: { $in: ['en_cours', 'pause'] },
        utilisateur: req.user.id
      });
    } else if (timerPrestationId) {
      // Pour les prestations, vérifier par prestation et plaque
      sessionActive = await TimerSession.findOne({
        timerPrestation: timerPrestationId,
        vehiculePlaque: vehiculePlaque || '',
        statut: { $in: ['en_cours', 'pause'] },
        utilisateur: req.user.id
      });
    }
    
    if (sessionActive) {
      return res.status(400).json({
        success: false,
        error: 'Une session est déjà active pour cette prestation et ce véhicule'
      });
    }
    
    const session = new TimerSession({
      timerPrestation: timerPrestationId,
      vehicle: vehicleId,
      vehiculePlaque: vehiculePlaque || (vehicle ? vehicle.plaque : ''),
      vehiculeInfo: vehiculeInfo || (vehicle ? {
        nom: vehicle.nom,
        marque: vehicle.marque,
        modele: vehicle.modele,
        plaque: vehicle.plaque
      } : null),
      heureDebut: new Date(),
      utilisateur: req.user.id,
      company: finalCompanyId,
      partenariat: partenariat || 'Aucun partenaire',
      notes: notes?.trim(),
      historiqueActions: [{
        action: 'start',
        timestamp: new Date()
      }]
    });
    
    await session.save();
    
    // Populer selon le type de session
    if (vehicleId) {
      await session.populate(['vehicle', 'utilisateur']);
    } else {
      await session.populate(['timerPrestation', 'utilisateur']);
    }
    
    res.status(201).json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Erreur lors du démarrage de la session timer:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors du démarrage de la session timer'
    });
  }
});

// Mettre en pause/reprendre une session
router.put('/sessions/:id/pause', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, dureeMinutes } = req.body; // action: 'pause' ou 'resume'
    
    const session = await TimerSession.findById(id).populate('timerPrestation');
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session non trouvée'
      });
    }
    
    if (session.utilisateur.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Non autorisé à modifier cette session'
      });
    }
    
    if (session.statut !== 'en_cours' && session.statut !== 'pause') {
      return res.status(400).json({
        success: false,
        error: 'La session n\'est pas active'
      });
    }
    
    if (action === 'pause' && session.statut === 'en_cours') {
      session.statut = 'pause';
      session.historiqueActions.push({
        action: 'pause',
        timestamp: new Date()
      });
    } else if (action === 'resume' && session.statut === 'pause') {
      session.statut = 'en_cours';
      // Ajouter le temps de pause au total
      if (dureeMinutes) {
        session.pausesTotales += dureeMinutes;
      }
      session.historiqueActions.push({
        action: 'resume',
        timestamp: new Date()
      });
    }
    
    await session.save();
    
    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Erreur lors de la pause/reprise de la session:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la pause/reprise de la session'
    });
  }
});

// Terminer une session et l'ajouter au panier
router.put('/sessions/:id/stop', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantite = 1 } = req.body;
    
    const session = await TimerSession.findById(id).populate('timerPrestation');
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session non trouvée'
      });
    }
    
    if (session.utilisateur.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Non autorisé à modifier cette session'
      });
    }
    
    if (session.statut !== 'en_cours' && session.statut !== 'pause') {
      return res.status(400).json({
        success: false,
        error: 'La session n\'est pas active'
      });
    }
    
    // Terminer la session
    await session.terminer();
    
    // NE PLUS créer automatiquement une vente pour les timers
    // Les timers restent uniquement dans l'historique des timers
    const autoSale = null; // Désactivé pour éviter la duplication dans l'historique des ventes
    
    // Créer l'item pour le panier selon le type
    let itemPanier;
    if (session.vehicle) {
      // Nouveau mode avec véhicules
      await session.populate('vehicle');
      itemPanier = {
        _id: session._id.toString(),
        nom: session.vehicle.nom,
        description: `${session.vehicle.description || session.vehicle.getNomComplet()} (${session.dureeMinutes} min)`,
        price: session.coutCalcule,
        quantity: quantite,
        type: 'timer',
        dureeMinutes: session.dureeMinutes,
        tarifParMinute: session.vehicle.tarifParMinute,
        vehiculePlaque: session.vehicle.plaque,
        vehiculeInfo: {
          nom: session.vehicle.nom,
          marque: session.vehicle.marque,
          modele: session.vehicle.modele,
          plaque: session.vehicle.plaque
        },
        partenariat: session.partenariat,
        sessionId: session._id
      };
    } else {
      // Ancien mode avec prestations timer
      await session.populate('timerPrestation');
      itemPanier = {
        _id: session._id.toString(),
        nom: session.timerPrestation.nom,
        description: `${session.timerPrestation.description || ''} (${session.dureeMinutes} min)`,
        price: session.coutCalcule,
        quantity: quantite,
        type: 'timer',
        dureeMinutes: session.dureeMinutes,
        tarifParMinute: session.timerPrestation.tarifParMinute,
        vehiculePlaque: session.vehiculePlaque,
        vehiculeInfo: session.vehiculeInfo,
        partenariat: session.partenariat,
        sessionId: session._id
      };
    }
    
    res.json({
      success: true,
      session,
      itemPanier,
      autoSale: autoSale ? {
        _id: autoSale._id,
        totalPrix: autoSale.totalPrix,
        created: true
      } : null
    });
  } catch (error) {
    console.error('Erreur lors de l\'arrêt de la session:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de l\'arrêt de la session'
    });
  }
});

// Récupérer les sessions actives d'un utilisateur
router.get('/sessions/active/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const sessions = await TimerSession.find({
      company: companyId,
      utilisateur: req.user.id,
      statut: { $in: ['en_cours', 'pause'] }
    }).populate(['timerPrestation', 'vehicle', 'utilisateur']);
    
    // Calculer la durée et le coût en temps réel pour chaque session
    const sessionsWithRealTime = sessions.map(session => {
      if (session.statut === 'en_cours') {
        const now = new Date();
        const debut = new Date(session.heureDebut);
        const dureeMinutes = Math.floor((now.getTime() - debut.getTime()) / (1000 * 60));
        const dureeEffective = Math.max(0, dureeMinutes - session.pausesTotales);
        
        let tarifParMinute = 0;
        if (session.vehicle) {
          tarifParMinute = session.vehicle.tarifParMinute;
        } else if (session.timerPrestation) {
          tarifParMinute = session.timerPrestation.tarifParMinute;
        }
        
        return {
          ...session.toObject(),
          dureeMinutes: dureeEffective,
          coutCalcule: tarifParMinute * dureeEffective
        };
      }
      return session.toObject();
    });
    
    res.json({
      success: true,
      sessions: sessionsWithRealTime
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des sessions actives:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des sessions actives'
    });
  }
});

// Annuler une session
router.delete('/sessions/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await TimerSession.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session non trouvée'
      });
    }
    
    if (session.utilisateur.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Non autorisé à supprimer cette session'
      });
    }
    
    if (session.statut === 'termine') {
      return res.status(400).json({
        success: false,
        error: 'Impossible d\'annuler une session terminée'
      });
    }
    
    session.statut = 'annule';
    session.historiqueActions.push({
      action: 'cancel',
      timestamp: new Date()
    });
    
    await session.save();
    
    res.json({
      success: true,
      message: 'Session annulée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'annulation de la session:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de l\'annulation de la session'
    });
  }
});

// Middleware spécifique pour la suppression de session
const checkDeleteSessionPermissions = async (req, res, next) => {
  try {
    // Les Techniciens ont toujours accès
    if (req.user.systemRole === 'Technicien') {
      return next();
    }
    
    const { sessionId } = req.params;
    
    // Récupérer la session et le véhicule associé
    const session = await TimerSession.findById(sessionId).populate('vehicle');
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session timer non trouvée'
      });
    }
    
    // Vérifier les permissions de l'entreprise du véhicule
    const companyId = session.vehicle?.company || req.user.company || req.user.currentCompany;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'ID d\'entreprise requis'
      });
    }
    
    const isAuthorized = await TimerPermission.isCompanyAuthorized(companyId);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Votre entreprise n\'est pas autorisée à utiliser les timers. Contactez un Technicien.'
      });
    }
    
    // Stocker la session pour éviter de la récupérer à nouveau
    req.timerSession = session;
    next();
  } catch (error) {
    console.error('Erreur lors de la vérification des permissions de suppression:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la vérification des permissions'
    });
  }
};

// Route pour supprimer définitivement une session timer (nécessite permission DELETE_TIMERS)
router.delete('/sessions/:sessionId/delete', auth, checkDeleteSessionPermissions, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = req.timerSession; // Récupérée par le middleware
    
    // Supprimer la session
    await TimerSession.findByIdAndDelete(sessionId);
    
    
    
    res.json({
      success: true,
      message: 'Session timer supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la session timer:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la suppression de la session timer'
    });
  }
});

// Route pour obtenir les statistiques hebdomadaires des timers
router.get('/stats/weekly/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { year, week } = req.query;
    
    if (!year || !week) {
      return res.status(400).json({
        success: false,
        error: 'Année et semaine requises (format: ?year=2024&week=42)'
      });
    }
    
    // Calculer les dates de début et fin de semaine
    const startOfWeek = getStartOfWeek(parseInt(year), parseInt(week));
    const endOfWeek = getEndOfWeek(parseInt(year), parseInt(week));
    
    // Récupérer toutes les sessions terminées de la semaine
    const sessions = await TimerSession.find({
      company: companyId,
      statut: 'termine',
      createdAt: {
        $gte: startOfWeek,
        $lte: endOfWeek
      }
    })
    .populate('vehicle', 'nom marque modele tarifParMinute')
    .populate('utilisateur', 'username firstName lastName')
    .sort({ createdAt: -1 });
    
    // Calculer les statistiques
    const stats = {
      totalSessions: sessions.length,
      totalDureeMinutes: sessions.reduce((sum, s) => sum + s.dureeMinutes, 0),
      totalRevenu: sessions.reduce((sum, s) => sum + s.coutCalcule, 0),
      moyenneDureeMinutes: sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + s.dureeMinutes, 0) / sessions.length) : 0,
      moyenneRevenu: sessions.length > 0 ? Math.round((sessions.reduce((sum, s) => sum + s.coutCalcule, 0) / sessions.length) * 100) / 100 : 0,
      
      // Statistiques par véhicule
      parVehicule: {},
      
      // Statistiques par utilisateur
      parUtilisateur: {},
      
      // Statistiques par jour
      parJour: {}
    };
    
    // Calculer les stats par véhicule
    sessions.forEach(session => {
      if (session.vehicle) {
        const vehicleKey = session.vehicle._id.toString();
        if (!stats.parVehicule[vehicleKey]) {
          stats.parVehicule[vehicleKey] = {
            nom: session.vehicle.nom,
            marque: session.vehicle.marque,
            modele: session.vehicle.modele,
            sessions: 0,
            dureeMinutes: 0,
            revenu: 0
          };
        }
        stats.parVehicule[vehicleKey].sessions++;
        stats.parVehicule[vehicleKey].dureeMinutes += session.dureeMinutes;
        stats.parVehicule[vehicleKey].revenu += session.coutCalcule;
      }
    });
    
    // Calculer les stats par utilisateur
    sessions.forEach(session => {
      const userKey = session.utilisateur._id.toString();
      const userName = `${session.utilisateur.firstName || ''} ${session.utilisateur.lastName || ''}`.trim() || session.utilisateur.username;
      
      if (!stats.parUtilisateur[userKey]) {
        stats.parUtilisateur[userKey] = {
          nom: userName,
          sessions: 0,
          dureeMinutes: 0,
          revenu: 0
        };
      }
      stats.parUtilisateur[userKey].sessions++;
      stats.parUtilisateur[userKey].dureeMinutes += session.dureeMinutes;
      stats.parUtilisateur[userKey].revenu += session.coutCalcule;
    });
    
    // Calculer les stats par jour
    sessions.forEach(session => {
      const dayKey = session.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      const dayName = session.createdAt.toLocaleDateString('fr-FR', { weekday: 'long' });
      
      if (!stats.parJour[dayKey]) {
        stats.parJour[dayKey] = {
          date: dayKey,
          nom: dayName,
          sessions: 0,
          dureeMinutes: 0,
          revenu: 0
        };
      }
      stats.parJour[dayKey].sessions++;
      stats.parJour[dayKey].dureeMinutes += session.dureeMinutes;
      stats.parJour[dayKey].revenu += session.coutCalcule;
    });
    
    // Convertir les objets en arrays pour faciliter l'affichage
    stats.parVehicule = Object.values(stats.parVehicule);
    stats.parUtilisateur = Object.values(stats.parUtilisateur);
    stats.parJour = Object.values(stats.parJour).sort((a, b) => a.date.localeCompare(b.date));
    
    res.json({
      success: true,
      periode: {
        year: parseInt(year),
        week: parseInt(week),
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0]
      },
      stats,
      sessions: sessions.map(s => ({
        _id: s._id,
        vehicle: s.vehicle ? {
          nom: s.vehicle.nom,
          marque: s.vehicle.marque,
          modele: s.vehicle.modele
        } : null,
        utilisateur: {
          nom: `${s.utilisateur.firstName || ''} ${s.utilisateur.lastName || ''}`.trim() || s.utilisateur.username
        },
        dureeMinutes: s.dureeMinutes,
        coutCalcule: s.coutCalcule,
        createdAt: s.createdAt,
        statut: s.statut
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques hebdomadaires:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// Route pour nettoyer les ventes automatiques des timers (migration)
router.post('/cleanup/auto-sales/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    // Vérifier que l'utilisateur est technicien
    if (req.user.systemRole !== 'Technicien') {
      return res.status(403).json({
        success: false,
        error: 'Seuls les techniciens peuvent exécuter cette opération'
      });
    }
    
    // Trouver toutes les ventes qui contiennent "Session timer" dans les notes
    const ventesTimer = await Vente.find({
      company: companyId,
      notes: { $regex: /Session timer|Vente automatique.*timer/i }
    });
    
    console.log(`🔍 Trouvé ${ventesTimer.length} ventes automatiques de timers à nettoyer`);
    
    let cleaned = 0;
    for (const vente of ventesTimer) {
      // Marquer comme vente automatique de timer
      vente.source = 'timer_auto';
      await vente.save();
      cleaned++;
      console.log(`✅ Vente ${vente.numeroCommande} marquée comme timer_auto`);
    }
    
    res.json({
      success: true,
      message: `${cleaned} ventes automatiques de timers nettoyées et marquées`,
      ventesNettoyees: cleaned
    });
  } catch (error) {
    console.error('Erreur lors du nettoyage des ventes automatiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

module.exports = router;
