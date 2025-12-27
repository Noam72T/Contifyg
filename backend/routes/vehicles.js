const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Vehicle = require('../models/Vehicle');
const TimerPermission = require('../models/TimerPermission');
const multer = require('multer');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Fonction pour compresser une image
const compressImage = async (buffer, mimetype, maxWidth = 800, quality = 0.8) => {
  try {
    const img = await loadImage(buffer);
    
    // Calculer les nouvelles dimensions en gardant le ratio
    let { width, height } = img;
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }
    
    // Créer un canvas avec les nouvelles dimensions
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Dessiner l'image redimensionnée
    ctx.drawImage(img, 0, 0, width, height);
    
    // Convertir en buffer avec compression
    const outputFormat = mimetype === 'image/png' ? 'image/png' : 'image/jpeg';
    const compressedBuffer = canvas.toBuffer(outputFormat, quality);
    
    console.log(`🖼️ Image compressée: ${buffer.length} bytes -> ${compressedBuffer.length} bytes`);
    
    return {
      buffer: compressedBuffer,
      mimetype: outputFormat
    };
  } catch (error) {
    console.error('Erreur lors de la compression:', error);
    // En cas d'erreur, retourner l'image originale
    return { buffer, mimetype };
  }
};

// Configuration multer pour l'upload d'images
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max (on compresse après)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées (jpeg, jpg, png, gif, webp)'));
    }
  }
});

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
    console.error('Erreur lors de la vérification des permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
};

// Route proxy pour l'API véhicules glife.fr
router.get('/search/:plate', auth, async (req, res) => {
  try {
    const { plate } = req.params;
    
   
    
    // Appel à l'API externe depuis le backend
    const fetch = (await import('node-fetch')).default;
    const apiUrl = `https://api.glife.fr/roleplay/vehicles?plate=${encodeURIComponent(plate)}`;
    
   
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Simplix-Comptabilite/1.0'
      }
    });
    
    
    
    if (response.ok) {
      const data = await response.json();
     
      
      // L'API retourne un tableau, on prend le premier élément
      const vehicleData = Array.isArray(data) && data.length > 0 ? data[0] : data;
      
      
      res.json({
        success: true,
        data: vehicleData
      });
    } else if (response.status === 404) {
      
      res.status(404).json({
        success: false,
        message: 'Véhicule non trouvé'
      });
    } else {
      
      res.status(response.status).json({
        success: false,
        message: `Erreur API: ${response.status} - ${response.statusText}`
      });
    }
  } catch (error) {
    console.error('💥 Erreur lors de l\'appel à l\'API véhicules:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la recherche du véhicule'
    });
  }
});

// ==================== GESTION DES VÉHICULES INTERNES ====================

// Récupérer tous les véhicules d'une entreprise
router.get('/company/:companyId', auth, checkTimerPermissions, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const vehicles = await Vehicle.find({
      company: companyId,
      isActive: true
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      vehicles: vehicles.map(vehicle => vehicle.toPublicJSON())
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des véhicules:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des véhicules'
    });
  }
});

// Créer un nouveau véhicule
router.post('/', auth, checkTimerPermissions, upload.single('image'), async (req, res) => {
  try {
    const { nom, marque, modele, plaque, couleur, annee, description, tarifParMinute, proprietaire, company: companyFromBody } = req.body;
    
    // Récupérer l'entreprise : depuis le body OU depuis l'utilisateur connecté
    const company = companyFromBody || req.user.company || req.user.currentCompany;
    
    // Debug: log des données reçues
    console.log('🚗 Données reçues pour création véhicule:', {
      nom, plaque, tarifParMinute, 
      'company (final)': company,
      'companyFromBody': companyFromBody,
      'user.company': req.user.company,
      'user.currentCompany': req.user.currentCompany
    });
    
    // Validation
    if (!nom || !plaque || !tarifParMinute) {
      return res.status(400).json({
        success: false,
        error: 'Nom, plaque et tarif par minute sont requis'
      });
    }
    
    if (!company) {
      return res.status(400).json({
        success: false,
        error: 'Aucune entreprise associée à votre compte'
      });
    }
    
    if (tarifParMinute < 0) {
      return res.status(400).json({
        success: false,
        error: 'Le tarif par minute ne peut pas être négatif'
      });
    }
    
    // Vérifier l'unicité de la plaque dans l'entreprise
    const existingVehicle = await Vehicle.findOne({
      plaque: plaque.toUpperCase(),
      company,
      isActive: true
    });
    
    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        error: 'Un véhicule avec cette plaque existe déjà dans votre entreprise'
      });
    }
    
    // Traitement de l'image avec compression
    let imageData = null;
    if (req.file) {
      try {
        // Compresser l'image
        const compressed = await compressImage(req.file.buffer, req.file.mimetype);
        // Convertir l'image compressée en base64
        imageData = `data:${compressed.mimetype};base64,${compressed.buffer.toString('base64')}`;
      } catch (error) {
        console.error('Erreur lors de la compression de l\'image:', error);
        // En cas d'erreur, utiliser l'image originale
        imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }
    }
    
    // Parsing du propriétaire si c'est une string JSON
    let proprietaireData = null;
    if (proprietaire) {
      try {
        proprietaireData = typeof proprietaire === 'string' ? JSON.parse(proprietaire) : proprietaire;
      } catch (e) {
        proprietaireData = { nom: proprietaire };
      }
    }
    
    const vehicle = new Vehicle({
      nom: nom.trim(),
      marque: marque?.trim() || '',
      modele: modele?.trim() || '',
      plaque: plaque.toUpperCase().trim(),
      couleur: couleur?.trim(),
      annee: annee ? parseInt(annee) : undefined,
      image: imageData,
      description: description?.trim(),
      tarifParMinute: parseFloat(tarifParMinute),
      proprietaire: proprietaireData,
      company,
      creePar: req.user.id
    });
    
    await vehicle.save();
    
    res.status(201).json({
      success: true,
      vehicle: vehicle.toPublicJSON()
    });
  } catch (error) {
    console.error('Erreur lors de la création du véhicule:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la création du véhicule'
    });
  }
});

// Modifier un véhicule
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, marque, modele, plaque, couleur, annee, description, tarifParMinute, proprietaire } = req.body;
    
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Véhicule non trouvé'
      });
    }
    
    // Vérification des permissions - plus permissive
    // Les Techniciens ont toujours accès
    if (req.user.systemRole === 'Technicien') {
      // Technicien peut modifier n'importe quel véhicule
    } else {
      // Pour les autres utilisateurs, vérifier les permissions timer de l'entreprise
      try {
        const isAuthorized = await TimerPermission.isCompanyAuthorized(vehicle.company);
        if (!isAuthorized) {
          return res.status(403).json({
            success: false,
            error: 'Votre entreprise n\'est pas autorisée à gérer les véhicules. Contactez un Technicien.'
          });
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des permissions:', error);
        return res.status(500).json({
          success: false,
          error: 'Erreur serveur lors de la vérification des permissions'
        });
      }
    }
    
    // Validation du tarif
    if (tarifParMinute !== undefined && tarifParMinute < 0) {
      return res.status(400).json({
        success: false,
        error: 'Le tarif par minute ne peut pas être négatif'
      });
    }
    
    // Vérifier l'unicité de la plaque si modifiée
    if (plaque && plaque.toUpperCase() !== vehicle.plaque) {
      const existingVehicle = await Vehicle.findOne({
        plaque: plaque.toUpperCase(),
        company: vehicle.company,
        isActive: true,
        _id: { $ne: id }
      });
      
      if (existingVehicle) {
        return res.status(400).json({
          success: false,
          error: 'Un véhicule avec cette plaque existe déjà dans votre entreprise'
        });
      }
    }
    
    // Traitement de l'image avec compression
    if (req.file) {
      try {
        // Compresser l'image
        const compressed = await compressImage(req.file.buffer, req.file.mimetype);
        // Convertir l'image compressée en base64
        vehicle.image = `data:${compressed.mimetype};base64,${compressed.buffer.toString('base64')}`;
      } catch (error) {
        console.error('Erreur lors de la compression de l\'image:', error);
        // En cas d'erreur, utiliser l'image originale
        vehicle.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }
    }
    
    // Mise à jour des champs
    if (nom) vehicle.nom = nom.trim();
    if (marque) vehicle.marque = marque.trim();
    if (modele) vehicle.modele = modele.trim();
    if (plaque) vehicle.plaque = plaque.toUpperCase().trim();
    if (couleur !== undefined) vehicle.couleur = couleur.trim();
    if (annee) vehicle.annee = parseInt(annee);
    if (description !== undefined) vehicle.description = description.trim();
    if (tarifParMinute !== undefined) vehicle.tarifParMinute = parseFloat(tarifParMinute);
    
    if (proprietaire) {
      try {
        vehicle.proprietaire = typeof proprietaire === 'string' ? JSON.parse(proprietaire) : proprietaire;
      } catch (e) {
        vehicle.proprietaire = { nom: proprietaire };
      }
    }
    
    await vehicle.save();
    
    res.json({
      success: true,
      vehicle: vehicle.toPublicJSON()
    });
  } catch (error) {
    console.error('Erreur lors de la modification du véhicule:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la modification du véhicule'
    });
  }
});

// Supprimer un véhicule (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Véhicule non trouvé'
      });
    }
    
    // Vérification des permissions - plus permissive
    // Les Techniciens ont toujours accès
    if (req.user.systemRole === 'Technicien') {
      // Technicien peut supprimer n'importe quel véhicule
    } else {
      // Pour les autres utilisateurs, vérifier les permissions timer de l'entreprise
      try {
        const isAuthorized = await TimerPermission.isCompanyAuthorized(vehicle.company);
        if (!isAuthorized) {
          return res.status(403).json({
            success: false,
            error: 'Votre entreprise n\'est pas autorisée à gérer les véhicules. Contactez un Technicien.'
          });
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des permissions:', error);
        return res.status(500).json({
          success: false,
          error: 'Erreur serveur lors de la vérification des permissions'
        });
      }
    }
    
    // Soft delete
    vehicle.isActive = false;
    await vehicle.save();
    
    res.json({
      success: true,
      message: 'Véhicule supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du véhicule:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la suppression du véhicule'
    });
  }
});

// Obtenir les statistiques d'un véhicule
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Véhicule non trouvé'
      });
    }
    
    res.json({
      success: true,
      stats: vehicle.stats,
      vehicle: {
        _id: vehicle._id,
        nom: vehicle.nom,
        marque: vehicle.marque,
        modele: vehicle.modele,
        plaque: vehicle.plaque
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des statistiques'
    });
  }
});

module.exports = router;
