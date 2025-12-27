const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Récupérer le token depuis le header Authorization uniquement
    const authHeader = req.header('Authorization');
   
    
    const token = authHeader?.replace('Bearer ', '');
    

    if (!token) {
     
      return res.status(401).json({ 
        success: false, 
        message: 'Accès refusé. Aucun token fourni.' 
      });
    }

  
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    
    // Le token contient 'id' et non 'userId'
    const userId = decoded.userId || decoded.id;
   
    
    const user = await User.findById(userId)
      .populate('company', 'name')
      .populate('role', 'nom niveau');


    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token invalide.' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Compte inactif.' 
      });
    }

    req.user = user;
    req.userId = user._id; // Ajout pour compatibilité
    
   
    
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error.message);
    console.error('Token problématique:', req.header('Authorization'));
    res.status(401).json({ 
      success: false, 
      message: 'Token invalide.' 
    });
  }
};

module.exports = auth;
