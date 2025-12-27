const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const User = require('../models/User');

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_REDIRECT_URI,
    scope: ['identify', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('🔍 Stratégie Discord appelée');
        console.log('Profile Discord reçu:', {
            id: profile.id,
            username: profile.username,
            email: profile.email
        });
        
        // Vérifier si l'utilisateur existe déjà avec cet ID Discord
        let user = await User.findOne({ discordId: profile.id });

        if (user) {
            console.log('👤 Utilisateur Discord existant trouvé:', user.email);
            // Mettre à jour les informations Discord si nécessaire
            user.discordUsername = profile.username;
            // S'assurer que username est toujours défini (important pour la reconnexion)
            if (!user.username || user.username === '') {
                user.username = profile.username;
            }
            const avatarUrl = profile.avatar 
                ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
                : null;
            user.avatar = avatarUrl;
            user.lastLogin = new Date();
            await user.save({ validateBeforeSave: false });
            console.log('✅ Utilisateur mis à jour - username:', user.username);
            return done(null, user);
        }

        // Vérifier si un utilisateur existe avec le même email
        if (profile.email) {
            user = await User.findOne({ email: profile.email });
            if (user) {
                // Lier le compte Discord à l'utilisateur existant
                user.discordId = profile.id;
                user.discordUsername = profile.username;
                // S'assurer que username est toujours défini
                if (!user.username || user.username === '') {
                    user.username = profile.username;
                }
                const avatarUrl = profile.avatar 
                    ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
                    : null;
                user.avatar = avatarUrl;
                user.lastLogin = new Date();
                await user.save({ validateBeforeSave: false });
                console.log('✅ Compte Discord lié à utilisateur existant - username:', user.username);
                return done(null, user);
            }
        }

        // Créer un nouvel utilisateur Discord temporaire (sans validation d'entreprise)
        const avatarUrl = profile.avatar 
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null;
        
        // Utiliser l'email Discord ou créer un email par défaut
        const userEmail = profile.email || `${profile.id}@discord.user`;
        if (!profile.email) {
            console.log('⚠️ Discord n\'a pas fourni d\'email, utilisation d\'un email par défaut:', userEmail);
        }
            
        const newUser = new User({
            discordId: profile.id,
            discordUsername: profile.username,
            email: userEmail,
            avatar: avatarUrl,
            username: profile.username,
            // firstName et lastName seront définis lors de la complétion du profil
            // Ne pas les définir ici pour éviter les erreurs de validation
            phoneNumber: '',
            idUser: `discord_${profile.id}`,
            compteBancaire: '',
            isActive: true,
            isCompanyValidated: false // Pas encore validé par code d'entreprise
        });

        
        await newUser.save({ validateBeforeSave: false });
        return done(null, newUser);

    } catch (error) {
        console.error('Erreur lors de l\'authentification Discord:', error);
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user._id || user.discordData?.discordId);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id) || await User.findOne({ discordId: id });
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
