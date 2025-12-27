const express = require('express');
const router = express.Router();
const multer = require('multer');
// Import robuste pour pdf-parse (gère différentes versions)
let pdfParse;
try {
  // Essayer l'import ES module
  const pdfParseModule = require('pdf-parse');
  pdfParse = pdfParseModule.default || pdfParseModule;
  
  // Vérifier que c'est bien une fonction
  if (typeof pdfParse !== 'function') {
    throw new Error('pdf-parse n\'est pas une fonction');
  }
} catch (error) {
  console.error('Erreur import pdf-parse:', error.message);
  // Fallback: essayer un import direct
  try {
    pdfParse = require('pdf-parse');
  } catch (fallbackError) {
    console.error('Erreur fallback pdf-parse:', fallbackError.message);
    pdfParse = null;
  }
}

// Log du statut de pdfParse au démarrage
console.log('📄 Statut pdf-parse:', pdfParse ? 'DISPONIBLE' : 'NON DISPONIBLE', typeof pdfParse);
const ItemPack = require('../models/ItemPack');
const Item = require('../models/Item');
const auth = require('../middleware/auth');

// Configuration multer pour l'upload de fichiers PDF
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max (augmenté pour la prod)
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont acceptés'), false);
    }
  }
});

// Middleware pour vérifier si l'utilisateur est technicien
const isTechnician = (req, res, next) => {
  if (req.user.systemRole !== 'Technicien') {
    return res.status(403).json({ message: 'Accès réservé aux techniciens' });
  }
  next();
};

// GET - Récupérer tous les packs d'items (pour les techniciens)
router.get('/', auth, async (req, res) => {
  try {
    const packs = await ItemPack.find({ isActive: true })
      .populate('creePar', 'username firstName lastName')
      .sort({ dateCreation: -1 });
    
    res.json(packs);
  } catch (error) {
    console.error('Erreur lors de la récupération des packs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET - Récupérer un pack spécifique
router.get('/:id', auth, async (req, res) => {
  try {
    const pack = await ItemPack.findById(req.params.id)
      .populate('creePar', 'username firstName lastName');
    
    if (!pack) {
      return res.status(404).json({ message: 'Pack non trouvé' });
    }
    
    res.json(pack);
  } catch (error) {
    console.error('Erreur lors de la récupération du pack:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST - Créer un nouveau pack (techniciens uniquement)
router.post('/', auth, isTechnician, async (req, res) => {
  try {
    const { nom, description, items } = req.body;
    
    if (!nom) {
      return res.status(400).json({ message: 'Le nom du pack est requis' });
    }
    
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Le pack doit contenir au moins un item' });
    }
    
    // Calculer la marge brute pour chaque item
    const processedItems = items.map(item => ({
      ...item,
      margeBrute: item.coutRevient === 0 ? item.prixVente : item.prixVente - item.coutRevient
    }));
    
    const newPack = new ItemPack({
      nom,
      description: description || '',
      items: processedItems,
      creePar: req.userId
    });
    
    await newPack.save();
    
    const populatedPack = await ItemPack.findById(newPack._id)
      .populate('creePar', 'username firstName lastName');
    
    console.log(`📦 Pack créé: ${nom} avec ${items.length} items par ${req.user.username}`);
    
    res.status(201).json(populatedPack);
  } catch (error) {
    console.error('Erreur lors de la création du pack:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT - Modifier un pack (techniciens uniquement)
router.put('/:id', auth, isTechnician, async (req, res) => {
  try {
    const { nom, description, items, isActive } = req.body;
    
    const pack = await ItemPack.findById(req.params.id);
    if (!pack) {
      return res.status(404).json({ message: 'Pack non trouvé' });
    }
    
    // Calculer la marge brute pour chaque item si items fournis
    let processedItems = pack.items;
    if (items) {
      processedItems = items.map(item => ({
        ...item,
        margeBrute: item.coutRevient === 0 ? item.prixVente : item.prixVente - item.coutRevient
      }));
    }
    
    pack.nom = nom || pack.nom;
    pack.description = description !== undefined ? description : pack.description;
    pack.items = processedItems;
    pack.isActive = isActive !== undefined ? isActive : pack.isActive;
    
    await pack.save();
    
    const updatedPack = await ItemPack.findById(pack._id)
      .populate('creePar', 'username firstName lastName');
    
    console.log(`📦 Pack modifié: ${pack.nom}`);
    
    res.json(updatedPack);
  } catch (error) {
    console.error('Erreur lors de la modification du pack:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// DELETE - Supprimer un pack (techniciens uniquement)
router.delete('/:id', auth, isTechnician, async (req, res) => {
  try {
    const pack = await ItemPack.findById(req.params.id);
    if (!pack) {
      return res.status(404).json({ message: 'Pack non trouvé' });
    }
    
    await ItemPack.findByIdAndDelete(req.params.id);
    
    console.log(`📦 Pack supprimé: ${pack.nom}`);
    
    res.json({ message: 'Pack supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du pack:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST - Charger un pack dans une entreprise (créer les items)
router.post('/:id/load', auth, async (req, res) => {
  try {
    const { companyId } = req.body;
    
    if (!companyId) {
      return res.status(400).json({ message: 'L\'ID de l\'entreprise est requis' });
    }
    
    const pack = await ItemPack.findById(req.params.id);
    if (!pack) {
      return res.status(404).json({ message: 'Pack non trouvé' });
    }
    
    if (!pack.isActive) {
      return res.status(400).json({ message: 'Ce pack n\'est plus disponible' });
    }
    
    // Créer les items pour l'entreprise
    const createdItems = [];
    const skippedItems = [];
    
    for (const packItem of pack.items) {
      // Vérifier si un item avec le même nom existe déjà pour cette entreprise
      const existingItem = await Item.findOne({
        nom: packItem.nom,
        company: companyId
      });
      
      if (existingItem) {
        skippedItems.push(packItem.nom);
        continue;
      }
      
      const newItem = new Item({
        nom: packItem.nom,
        image: packItem.image,
        type: [], // Catégories vides - l'entreprise les définira
        prixVente: packItem.prixVente,
        coutRevient: packItem.coutRevient,
        margeBrute: packItem.margeBrute,
        gestionStock: packItem.gestionStock,
        customCategory: packItem.customCategory || '',
        company: companyId,
        creePar: req.userId
      });
      
      await newItem.save();
      createdItems.push(newItem);
    }
    
    console.log(`📦 Pack "${pack.nom}" chargé pour l'entreprise ${companyId}: ${createdItems.length} items créés, ${skippedItems.length} ignorés`);
    
    res.json({
      success: true,
      message: `Pack chargé avec succès`,
      created: createdItems.length,
      skipped: skippedItems.length,
      skippedItems: skippedItems,
      items: createdItems
    });
  } catch (error) {
    console.error('Erreur lors du chargement du pack:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

router.post('/import-pdf', auth, isTechnician, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier PDF fourni' });
    }

    console.log('📄 Import PDF reçu, taille:', req.file.size, 'bytes');

    // Vérifier que pdfParse est disponible
    if (!pdfParse || typeof pdfParse !== 'function') {
      return res.status(500).json({ 
        message: 'Module pdf-parse non disponible. Contactez l\'administrateur.',
        error: 'pdfParse is not a function'
      });
    }

    // Parser le PDF
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text;
    
    console.log('📄 Contenu PDF extrait, longueur:', text.length);

    const items = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    console.log('📄 Nombre de lignes:', lines.length);
    console.log('📄 Premières lignes:', lines.slice(0, 15));

    // Pattern pour extraire les prix et l'URL d'une ligne comme "4504500https://i.imgur.com/..."
    // Format: PrixVente + Entreprise + Orga + URL
    // Exemple: "350100250https://..." = PrixVente:350, Entreprise:100, Orga:250
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Ignorer les lignes d'en-tête
      if (line.includes('Description') || line.includes('ID') && line.includes('Entreprise')) {
        i++;
        continue;
      }
      
      // Chercher un ID numérique seul sur une ligne
      if (/^\d+$/.test(line)) {
        const id = parseInt(line);
        
        // La ligne suivante devrait être la description
        if (i + 1 < lines.length) {
          const descriptionLine = lines[i + 1].trim();
          
          // La ligne après devrait contenir les prix et l'URL
          if (i + 2 < lines.length) {
            const dataLine = lines[i + 2].trim();
            
            // Pattern pour extraire: nombres collés + URL
            // Ex: "4504500https://i.imgur.com/1B2EThq.png..."
            // ou "350100250https://i.imgur.com/jML44lB.png..."
            // Chercher l'URL dans la ligne de données OU dans les lignes suivantes
            let urlMatch = dataLine.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|PNG|JPG|JPEG|GIF|WEBP))/i);
            let numbersBeforeUrl = urlMatch ? dataLine.substring(0, dataLine.indexOf(urlMatch[1])) : dataLine;
            
            // Si pas d'URL trouvée, chercher dans les lignes suivantes (jusqu'à 3 lignes)
            if (!urlMatch) {
              for (let j = i + 3; j < Math.min(i + 6, lines.length); j++) {
                const nextLine = lines[j].trim();
                const nextUrlMatch = nextLine.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|PNG|JPG|JPEG|GIF|WEBP))/i);
                if (nextUrlMatch) {
                  urlMatch = nextUrlMatch;
                  break;
                }
              }
            }
            
            // Extraire les nombres de la partie avant l'URL
            // On doit deviner où couper les nombres collés
            // Stratégie: chercher des patterns de prix (généralement 2-4 chiffres)
            
            let prixVente = 0, entreprise = 0, orga = 0;
            let imageUrl = urlMatch ? urlMatch[1] : '';
            
            // Analyser les nombres collés
            // Format: PrixVente + Entreprise + Orga (collés)
            // Règle: PrixVente = Entreprise + Orga
            // Exemples:
            // "4504500" -> 450, 450, 0 (450 = 450 + 0)
            // "350100250" -> 350, 100, 250 (350 = 100 + 250)
            // "34004003000" -> 3400, 400, 3000 (3400 = 400 + 3000)
            
            const numStr = numbersBeforeUrl.replace(/\D/g, '');
            console.log(`  📊 Nombres bruts: "${numStr}" (longueur: ${numStr.length})`);
            
            if (numStr.length >= 3) {
              // Stratégie: tester différentes décompositions et vérifier PrixVente = Entreprise + Orga
              let found = false;
              
              // Essayer toutes les combinaisons possibles (en commençant par les prix les plus longs pour éviter les faux positifs comme 2 au lieu de 200)
              for (let p = numStr.length - 2; p >= 1 && !found; p--) {
                for (let e = 1; e <= numStr.length - p - 1 && !found; e++) {
                  const pv = parseInt(numStr.substring(0, p));
                  const ent = parseInt(numStr.substring(p, p + e));
                  const org = parseInt(numStr.substring(p + e));
                  
                  // Vérifier si PrixVente = Entreprise + Orga
                  if (pv === ent + org && pv > 0 && ent >= 0 && org >= 0) {
                    prixVente = pv;
                    entreprise = ent;
                    orga = org;
                    found = true;
                    console.log(`  ✅ Décomposition trouvée: ${pv} = ${ent} + ${org}`);
                  }
                }
              }
              
              // Si pas trouvé avec la règle, essayer une décomposition simple
              if (!found) {
                // Diviser en 3 parties égales approximativement
                const len = numStr.length;
                const partLen = Math.floor(len / 3);
                prixVente = parseInt(numStr.substring(0, partLen + (len % 3 >= 1 ? 1 : 0)));
                entreprise = parseInt(numStr.substring(partLen + (len % 3 >= 1 ? 1 : 0), 2 * partLen + (len % 3 >= 2 ? 2 : (len % 3 >= 1 ? 1 : 0))));
                orga = parseInt(numStr.substring(2 * partLen + (len % 3 >= 2 ? 2 : (len % 3 >= 1 ? 1 : 0))));
                console.log(`  ⚠️ Décomposition approximative: ${prixVente}, ${entreprise}, ${orga}`);
              }
            }
            
            // Vérifier qu'on a des valeurs valides et une description
            if (descriptionLine && descriptionLine.length > 0 && 
                !descriptionLine.match(/^(ID|Description|Prix|Entreprise|Orga|Image|Stock|Category|Icon)/i) &&
                prixVente > 0) {
              
              // prixVente = Prix de vente (ce que le client paie)
              // entreprise = Coût de revient
              // orga = Commission/Marge
              const item = {
                nom: descriptionLine,
                image: imageUrl,
                prixVente: prixVente,        // Prix de vente
                coutRevient: entreprise,      // Coût de revient (colonne Entreprise)
                margeBrute: orga,             // Commission (colonne Orga)
                gestionStock: false,
                customCategory: ''
              };
              
              items.push(item);
              console.log(`📦 Item #${id}: ${item.nom} - PrixVente: ${prixVente}, CoutRevient: ${entreprise}, Marge/Commission: ${orga}, Image: ${imageUrl ? '✓' : '✗'}`);
              
              i += 3; // Passer les 3 lignes traitées
              continue;
            }
          }
        }
      }
      
      i++;
    }
    
    console.log(`📄 Total items extraits: ${items.length}`);
    
    // Passe finale: chercher toutes les URLs et les associer aux items sans image
    const allUrls = [];
    for (const line of lines) {
      const urlMatches = line.match(/https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)/gi);
      if (urlMatches) {
        allUrls.push(...urlMatches);
      }
    }
    console.log(`📷 Total URLs trouvées dans le PDF: ${allUrls.length}`);
    
    // Associer les URLs aux items sans image (dans l'ordre)
    let urlIndex = 0;
    for (const item of items) {
      if (!item.image && urlIndex < allUrls.length) {
        item.image = allUrls[urlIndex];
        console.log(`📷 Image assignée (passe finale) à "${item.nom}": ${allUrls[urlIndex]}`);
      }
      urlIndex++;
    }
    
    // Compter les items avec/sans image
    const itemsWithImage = items.filter(i => i.image).length;
    const itemsWithoutImage = items.filter(i => !i.image).length;
    console.log(`📷 Items avec image: ${itemsWithImage}, sans image: ${itemsWithoutImage}`);
    
    if (items.length === 0) {
      // Retourner le texte brut pour debug
      return res.status(400).json({ 
        message: 'Aucun item trouvé dans le PDF. Vérifiez le format.',
        debug: {
          textLength: text.length,
          linesCount: lines.length,
          preview: text.substring(0, 2000),
          sampleLines: lines.slice(0, 30)
        }
      });
    }
    
    res.json({
      success: true,
      message: `${items.length} items extraits du PDF`,
      items: items,
      debug: {
        totalLines: lines.length,
        textLength: text.length
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'import PDF:', error);
    res.status(500).json({ message: 'Erreur lors de l\'import du PDF', error: error.message });
  }
});

// POST - Parser un PDF pour tous les utilisateurs (pas seulement techniciens)
// Cette route permet aux entreprises d'importer des items depuis un PDF
router.post('/parse-pdf', auth, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier PDF fourni' });
    }

    console.log('📄 Parse PDF reçu (entreprise), taille:', req.file.size, 'bytes');

    // Vérifier que pdfParse est disponible
    if (!pdfParse || typeof pdfParse !== 'function') {
      return res.status(500).json({ 
        message: 'Module pdf-parse non disponible. Contactez l\'administrateur.',
        error: 'pdfParse is not a function'
      });
    }

    // Parser le PDF
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text;
    
    console.log('📄 Contenu PDF extrait, longueur:', text.length);

    const items = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    console.log('📄 Nombre de lignes:', lines.length);

    // Pattern pour détecter les URLs d'images (imgur, etc.)
    const imagePattern = /(https?:\/\/[^\s]+)/i;
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Ignorer les lignes d'en-tête
      if (line.includes('Description') || line.includes('ID') && line.includes('Entreprise')) {
        i++;
        continue;
      }
      
      // Chercher un ID numérique seul sur une ligne
      if (/^\d+$/.test(line)) {
        const id = parseInt(line);
        
        // La ligne suivante devrait être la description
        if (i + 1 < lines.length) {
          const descriptionLine = lines[i + 1].trim();
          
          // La ligne après devrait contenir les prix et l'URL
          if (i + 2 < lines.length) {
            const dataLine = lines[i + 2].trim();
            
            // Chercher l'URL dans la ligne de données OU dans les lignes suivantes
            let urlMatch = dataLine.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|PNG|JPG|JPEG|GIF|WEBP))/i);
            let numbersBeforeUrl = urlMatch ? dataLine.substring(0, dataLine.indexOf(urlMatch[1])) : dataLine;
            
            // Si pas d'URL trouvée, chercher dans les lignes suivantes
            if (!urlMatch) {
              for (let j = i + 3; j < Math.min(i + 6, lines.length); j++) {
                const nextLine = lines[j].trim();
                const nextUrlMatch = nextLine.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|PNG|JPG|JPEG|GIF|WEBP))/i);
                if (nextUrlMatch) {
                  urlMatch = nextUrlMatch;
                  break;
                }
              }
            }
            
            let prixVente = 0, entreprise = 0, orga = 0;
            let imageUrl = urlMatch ? urlMatch[1] : '';
            
            const numStr = numbersBeforeUrl.replace(/\D/g, '');
            
            if (numStr.length >= 3) {
              let found = false;
              
              for (let p = 1; p <= numStr.length - 2 && !found; p++) {
                for (let e = 1; e <= numStr.length - p - 1 && !found; e++) {
                  const pv = parseInt(numStr.substring(0, p));
                  const ent = parseInt(numStr.substring(p, p + e));
                  const org = parseInt(numStr.substring(p + e));
                  
                  if (pv === ent + org && pv > 0 && ent >= 0 && org >= 0) {
                    prixVente = pv;
                    entreprise = ent;
                    orga = org;
                    found = true;
                  }
                }
              }
              
              if (!found) {
                const len = numStr.length;
                const partLen = Math.floor(len / 3);
                prixVente = parseInt(numStr.substring(0, partLen + (len % 3 >= 1 ? 1 : 0)));
                entreprise = parseInt(numStr.substring(partLen + (len % 3 >= 1 ? 1 : 0), 2 * partLen + (len % 3 >= 2 ? 2 : (len % 3 >= 1 ? 1 : 0))));
                orga = parseInt(numStr.substring(2 * partLen + (len % 3 >= 2 ? 2 : (len % 3 >= 1 ? 1 : 0))));
              }
            }
            
            if (descriptionLine && descriptionLine.length > 0 && 
                !descriptionLine.match(/^(ID|Description|Prix|Entreprise|Orga|Image|Stock|Category|Icon)/i) &&
                prixVente > 0) {
              
              const item = {
                nom: descriptionLine,
                image: imageUrl,
                prixVente: prixVente,
                coutRevient: entreprise,
                margeBrute: orga,
                gestionStock: false,
                customCategory: ''
              };
              
              items.push(item);
              console.log(`📦 Item #${id}: ${item.nom} - PrixVente: ${prixVente}, CoutRevient: ${entreprise}, Marge: ${orga}`);
              
              i += 3;
              continue;
            }
          }
        }
      }
      
      i++;
    }
    
    console.log(`📄 Total items extraits: ${items.length}`);
    
    // Passe finale: chercher toutes les URLs et les associer aux items sans image
    const allUrls = [];
    for (const line of lines) {
      const urlMatches = line.match(/https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)/gi);
      if (urlMatches) {
        allUrls.push(...urlMatches);
      }
    }
    
    let urlIndex = 0;
    for (const item of items) {
      if (!item.image && urlIndex < allUrls.length) {
        item.image = allUrls[urlIndex];
      }
      urlIndex++;
    }
    
    if (items.length === 0) {
      return res.status(400).json({ 
        message: 'Aucun item trouvé dans le PDF. Vérifiez le format.',
        debug: {
          textLength: text.length,
          linesCount: lines.length,
          preview: text.substring(0, 2000),
          sampleLines: lines.slice(0, 30)
        }
      });
    }
    
    res.json({
      success: true,
      message: `${items.length} items extraits du PDF`,
      items: items
    });
    
  } catch (error) {
    console.error('Erreur lors du parsing PDF:', error);
    res.status(500).json({ message: 'Erreur lors de la lecture du PDF', error: error.message });
  }
});

// POST - Parser un PDF depuis des données base64 (contournement des limites de reverse proxy)
router.post('/parse-pdf-base64', auth, async (req, res) => {
  try {
    const { pdfData, filename, size } = req.body;
    
    if (!pdfData) {
      return res.status(400).json({ message: 'Aucune donnée PDF fournie' });
    }

    console.log('📄 Parse PDF base64 reçu, taille originale:', size, 'bytes, nom:', filename);

    // Vérifier que pdfParse est disponible
    if (!pdfParse || typeof pdfParse !== 'function') {
      return res.status(500).json({ 
        message: 'Module pdf-parse non disponible. Contactez l\'administrateur.',
        error: 'pdfParse is not a function'
      });
    }

    // Convertir base64 en buffer
    const pdfBuffer = Buffer.from(pdfData, 'base64');
    
    // Parser le PDF
    const pdfDataParsed = await pdfParse(pdfBuffer);
    const text = pdfDataParsed.text;
    
    console.log('📄 Contenu PDF extrait, longueur:', text.length);

    const items = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    console.log('📄 Nombre de lignes:', lines.length);

    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Ignorer les lignes d'en-tête
      if (line.includes('Description') || line.includes('ID') && line.includes('Entreprise')) {
        i++;
        continue;
      }
      
      // Chercher un ID numérique seul sur une ligne
      if (/^\d+$/.test(line)) {
        const id = parseInt(line);
        
        // La ligne suivante devrait être la description
        if (i + 1 < lines.length) {
          const descriptionLine = lines[i + 1].trim();
          
          // La ligne après devrait contenir les prix et l'URL
          if (i + 2 < lines.length) {
            const dataLine = lines[i + 2].trim();
            
            // Chercher l'URL dans la ligne de données OU dans les lignes suivantes
            let urlMatch = dataLine.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|PNG|JPG|JPEG|GIF|WEBP))/i);
            let numbersBeforeUrl = urlMatch ? dataLine.substring(0, dataLine.indexOf(urlMatch[1])) : dataLine;
            
            // Si pas d'URL trouvée, chercher dans les lignes suivantes
            if (!urlMatch) {
              for (let j = i + 3; j < Math.min(i + 6, lines.length); j++) {
                const nextLine = lines[j].trim();
                const nextUrlMatch = nextLine.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|PNG|JPG|JPEG|GIF|WEBP))/i);
                if (nextUrlMatch) {
                  urlMatch = nextUrlMatch;
                  break;
                }
              }
            }
            
            let prixVente = 0, entreprise = 0, orga = 0;
            let imageUrl = urlMatch ? urlMatch[1] : '';
            
            const numStr = numbersBeforeUrl.replace(/\D/g, '');
            
            if (numStr.length >= 3) {
              let found = false;
              
              for (let p = 1; p <= numStr.length - 2 && !found; p++) {
                for (let e = 1; e <= numStr.length - p - 1 && !found; e++) {
                  const pv = parseInt(numStr.substring(0, p));
                  const ent = parseInt(numStr.substring(p, p + e));
                  const org = parseInt(numStr.substring(p + e));
                  
                  if (pv === ent + org && pv > 0 && ent >= 0 && org >= 0) {
                    prixVente = pv;
                    entreprise = ent;
                    orga = org;
                    found = true;
                  }
                }
              }
              
              if (!found) {
                const len = numStr.length;
                const partLen = Math.floor(len / 3);
                prixVente = parseInt(numStr.substring(0, partLen + (len % 3 >= 1 ? 1 : 0)));
                entreprise = parseInt(numStr.substring(partLen + (len % 3 >= 1 ? 1 : 0), 2 * partLen + (len % 3 >= 2 ? 2 : (len % 3 >= 1 ? 1 : 0))));
                orga = parseInt(numStr.substring(2 * partLen + (len % 3 >= 2 ? 2 : (len % 3 >= 1 ? 1 : 0))));
              }
            }
            
            if (descriptionLine && descriptionLine.length > 0 && 
                !descriptionLine.match(/^(ID|Description|Prix|Entreprise|Orga|Image|Stock|Category|Icon)/i) &&
                prixVente > 0) {
              
              const item = {
                nom: descriptionLine,
                image: imageUrl,
                prixVente: prixVente,
                coutRevient: entreprise,
                margeBrute: orga,
                gestionStock: false,
                customCategory: ''
              };
              
              items.push(item);
              console.log(`📦 Item #${id}: ${item.nom} - PrixVente: ${prixVente}, CoutRevient: ${entreprise}, Marge: ${orga}`);
              
              i += 3;
              continue;
            }
          }
        }
      }
      
      i++;
    }
    
    console.log(`📄 Total items extraits (base64): ${items.length}`);
    
    // Passe finale: chercher toutes les URLs et les associer aux items sans image
    const allUrls = [];
    for (const line of lines) {
      const urlMatches = line.match(/https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)/gi);
      if (urlMatches) {
        allUrls.push(...urlMatches);
      }
    }
    
    let urlIndex = 0;
    for (const item of items) {
      if (!item.image && urlIndex < allUrls.length) {
        item.image = allUrls[urlIndex];
      }
      urlIndex++;
    }
    
    if (items.length === 0) {
      return res.status(400).json({ 
        message: 'Aucun item trouvé dans le PDF. Vérifiez le format.',
        debug: {
          textLength: text.length,
          linesCount: lines.length,
          preview: text.substring(0, 2000),
          sampleLines: lines.slice(0, 30)
        }
      });
    }
    
    res.json({
      success: true,
      message: `${items.length} items extraits du PDF (via base64)`,
      items: items
    });
    
  } catch (error) {
    console.error('Erreur lors du parsing PDF base64:', error);
    res.status(500).json({ message: 'Erreur lors de la lecture du PDF', error: error.message });
  }
});

// Stockage temporaire des chunks
const uploadChunks = new Map();

// POST - Recevoir un chunk de PDF
router.post('/upload-chunk', auth, async (req, res) => {
  try {
    const { uploadId, chunkIndex, totalChunks, chunk, filename, fileSize, isLastChunk } = req.body;
    
    if (!uploadId || chunkIndex === undefined || !chunk) {
      return res.status(400).json({ message: 'Données de chunk manquantes' });
    }

    console.log(`📦 Chunk reçu ${chunkIndex + 1}/${totalChunks} pour ${filename}`);

    // Initialiser le stockage pour cet upload si nécessaire
    if (!uploadChunks.has(uploadId)) {
      uploadChunks.set(uploadId, {
        chunks: new Array(totalChunks),
        filename,
        fileSize,
        receivedChunks: 0
      });
    }

    const uploadData = uploadChunks.get(uploadId);
    uploadData.chunks[chunkIndex] = chunk;
    uploadData.receivedChunks++;

    console.log(`📦 Chunks reçus: ${uploadData.receivedChunks}/${totalChunks}`);

    res.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} reçu`,
      receivedChunks: uploadData.receivedChunks,
      totalChunks
    });

  } catch (error) {
    console.error('Erreur réception chunk:', error);
    res.status(500).json({ message: 'Erreur lors de la réception du chunk', error: error.message });
  }
});

// POST - Parser les chunks assemblés
router.post('/parse-chunks', auth, async (req, res) => {
  try {
    const { uploadId, filename, fileSize } = req.body;
    
    if (!uploadId || !uploadChunks.has(uploadId)) {
      return res.status(400).json({ message: 'Upload ID invalide ou chunks manquants' });
    }

    const uploadData = uploadChunks.get(uploadId);
    
    // Vérifier que tous les chunks sont reçus
    if (uploadData.receivedChunks !== uploadData.chunks.length) {
      return res.status(400).json({ 
        message: `Chunks manquants: ${uploadData.receivedChunks}/${uploadData.chunks.length}` 
      });
    }

    console.log(`🔧 Assemblage de ${uploadData.chunks.length} chunks pour ${filename}`);

    // Vérifier que tous les chunks sont présents
    for (let i = 0; i < uploadData.chunks.length; i++) {
      if (!uploadData.chunks[i]) {
        return res.status(400).json({ 
          message: `Chunk ${i + 1} manquant lors de l'assemblage` 
        });
      }
    }

    // Assembler tous les chunks
    const completeBase64 = uploadData.chunks.join('');
    
    // Nettoyer le stockage temporaire
    uploadChunks.delete(uploadId);

    console.log(`📄 PDF assemblé, taille finale: ${completeBase64.length} caractères`);
    
    // Vérifier que le base64 n'est pas vide
    if (!completeBase64 || completeBase64.length === 0) {
      return res.status(400).json({ 
        message: 'PDF assemblé vide - erreur lors de l\'assemblage' 
      });
    }

    // Vérifier que pdfParse est disponible
    if (!pdfParse || typeof pdfParse !== 'function') {
      return res.status(500).json({ 
        message: 'Module pdf-parse non disponible. Contactez l\'administrateur.',
        error: 'pdfParse is not a function'
      });
    }

    // Convertir base64 en buffer et parser
    let pdfBuffer, pdfDataParsed, text;
    try {
      pdfBuffer = Buffer.from(completeBase64, 'base64');
      console.log(`📄 Buffer PDF créé, taille: ${pdfBuffer.length} bytes`);
      
      pdfDataParsed = await pdfParse(pdfBuffer);
      text = pdfDataParsed.text;
      console.log(`📄 PDF parsé avec succès, texte extrait: ${text.length} caractères`);
    } catch (parseError) {
      console.error('Erreur lors du parsing PDF:', parseError);
      return res.status(400).json({ 
        message: 'Erreur lors de la lecture du PDF. Le fichier est peut-être corrompu.',
        error: parseError.message,
        debug: {
          base64Length: completeBase64.length,
          bufferSize: pdfBuffer ? pdfBuffer.length : 'N/A'
        }
      });
    }
    
    console.log('📄 Contenu PDF extrait, longueur:', text.length);

    const items = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    console.log('📄 Nombre de lignes:', lines.length);

    // Même logique de parsing que les autres routes
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (line.includes('Description') || line.includes('ID') && line.includes('Entreprise')) {
        i++;
        continue;
      }
      
      if (/^\d+$/.test(line)) {
        const id = parseInt(line);
        
        if (i + 1 < lines.length) {
          const descriptionLine = lines[i + 1].trim();
          
          if (i + 2 < lines.length) {
            const dataLine = lines[i + 2].trim();
            
            let urlMatch = dataLine.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|PNG|JPG|JPEG|GIF|WEBP))/i);
            let numbersBeforeUrl = urlMatch ? dataLine.substring(0, dataLine.indexOf(urlMatch[1])) : dataLine;
            
            if (!urlMatch) {
              for (let j = i + 3; j < Math.min(i + 6, lines.length); j++) {
                const nextLine = lines[j].trim();
                const nextUrlMatch = nextLine.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|PNG|JPG|JPEG|GIF|WEBP))/i);
                if (nextUrlMatch) {
                  urlMatch = nextUrlMatch;
                  break;
                }
              }
            }
            
            let prixVente = 0, entreprise = 0, orga = 0;
            let imageUrl = urlMatch ? urlMatch[1] : '';
            
            const numStr = numbersBeforeUrl.replace(/\D/g, '');
            
            if (numStr.length >= 3) {
              let found = false;
              
              for (let p = 1; p <= numStr.length - 2 && !found; p++) {
                for (let e = 1; e <= numStr.length - p - 1 && !found; e++) {
                  const pv = parseInt(numStr.substring(0, p));
                  const ent = parseInt(numStr.substring(p, p + e));
                  const org = parseInt(numStr.substring(p + e));
                  
                  if (pv === ent + org && pv > 0 && ent >= 0 && org >= 0) {
                    prixVente = pv;
                    entreprise = ent;
                    orga = org;
                    found = true;
                  }
                }
              }
              
              if (!found) {
                const len = numStr.length;
                const partLen = Math.floor(len / 3);
                prixVente = parseInt(numStr.substring(0, partLen + (len % 3 >= 1 ? 1 : 0)));
                entreprise = parseInt(numStr.substring(partLen + (len % 3 >= 1 ? 1 : 0), 2 * partLen + (len % 3 >= 2 ? 2 : (len % 3 >= 1 ? 1 : 0))));
                orga = parseInt(numStr.substring(2 * partLen + (len % 3 >= 2 ? 2 : (len % 3 >= 1 ? 1 : 0))));
              }
            }
            
            if (descriptionLine && descriptionLine.length > 0 && 
                !descriptionLine.match(/^(ID|Description|Prix|Entreprise|Orga|Image|Stock|Category|Icon)/i) &&
                prixVente > 0) {
              
              const item = {
                nom: descriptionLine,
                image: imageUrl,
                prixVente: prixVente,
                coutRevient: entreprise,
                margeBrute: orga,
                gestionStock: false,
                customCategory: ''
              };
              
              items.push(item);
              console.log(`📦 Item #${id}: ${item.nom} - PrixVente: ${prixVente}, CoutRevient: ${entreprise}, Marge: ${orga}`);
              
              i += 3;
              continue;
            }
          }
        }
      }
      
      i++;
    }
    
    console.log(`📄 Total items extraits (chunks): ${items.length}`);
    
    // Passe finale pour les images
    const allUrls = [];
    for (const line of lines) {
      const urlMatches = line.match(/https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)/gi);
      if (urlMatches) {
        allUrls.push(...urlMatches);
      }
    }
    
    let urlIndex = 0;
    for (const item of items) {
      if (!item.image && urlIndex < allUrls.length) {
        item.image = allUrls[urlIndex];
      }
      urlIndex++;
    }
    
    if (items.length === 0) {
      return res.status(400).json({ 
        message: 'Aucun item trouvé dans le PDF. Vérifiez le format.',
        debug: {
          textLength: text.length,
          linesCount: lines.length,
          preview: text.substring(0, 2000),
          sampleLines: lines.slice(0, 30)
        }
      });
    }
    
    res.json({
      success: true,
      message: `${items.length} items extraits du PDF (via chunks)`,
      items: items
    });
    
  } catch (error) {
    console.error('Erreur lors du parsing des chunks:', error);
    
    // Nettoyer en cas d'erreur
    if (req.body.uploadId && uploadChunks.has(req.body.uploadId)) {
      uploadChunks.delete(req.body.uploadId);
    }
    
    res.status(500).json({ message: 'Erreur lors du parsing des chunks', error: error.message });
  }
});

module.exports = router;
