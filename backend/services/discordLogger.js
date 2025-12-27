const axios = require('axios');

/**
 * Classe pour gérer l'envoi de notifications Discord avec des embeds riches et personnalisés.
 * @class DiscordLogger
 */
class DiscordLogger {
  /**
   * Initialise une nouvelle instance de DiscordLogger.
   */
  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || '';
    this.enabled = process.env.DISCORD_LOG_ENABLED === 'true';
    this.serverName = process.env.SERVER_NAME || 'Glife Compta';
    this.environment = process.env.NODE_ENV || 'production';
    this.defaultAvatar = 'https://cdn.discordapp.com/attachments/123456789/server-icon.png';
    
    // Webhooks spécialisés (optionnel)
    this.securityWebhook = process.env.DISCORD_SECURITY_WEBHOOK_URL || this.webhookUrl;
    this.activityWebhook = process.env.DISCORD_ACTIVITY_WEBHOOK_URL || this.webhookUrl;
  }

  /**
   * Valide la configuration du logger.
   * @returns {boolean} - Retourne true si la configuration est valide, sinon false.
   * @private
   */
  #validateConfig() {
    if (!this.enabled) {
      console.warn('[AVERTISSEMENT] Discord Logger désactivé dans la configuration');
      return false;
    }
    if (!this.webhookUrl) {
      console.warn('[AVERTISSEMENT] Webhook URL non configuré');
      return false;
    }
    return true;
  }

  /**
   * Formate un embed Discord avec des informations standardisées.
   * @param {Object} options - Options de l'embed
   * @returns {Object} - Objet embed formaté
   * @private
   */
  #formatEmbed({ title, description, color, fields = [], level }) {
    return {
      title: `${title}`,
      description: description || 'Aucune description fournie',
      color: parseInt((color || '#ffffff').replace('#', ''), 16),
      timestamp: new Date().toISOString(),
      fields: [
        {
          name: '[SERVEUR]',
          value: this.serverName,
          inline: true,
        },
        {
          name: '[ENVIRONNEMENT]',
          value: this.environment.toUpperCase(),
          inline: true,
        },
        {
          name: '[NIVEAU]',
          value: level.toUpperCase(),
          inline: true,
        },
        ...fields,
      ],
      footer: {
        text: 'Glife Compta Security System',
        icon_url: this.defaultAvatar,
      },
    };
  }

  /**
   * Envoie une notification à Discord via webhook.
   * @param {Object} options - Options de la notification
   * @param {string} options.title - Titre de l'embed
   * @param {string} options.description - Description de l'embed
   * @param {string} [options.color='#ffffff'] - Couleur de l'embed (hex)
   * @param {Array} [options.fields=[]] - Champs additionnels
   * @param {string} [options.level='info'] - Niveau de log (error, warn, info)
   * @returns {Promise<void>}
   */
  async sendNotification({ title, description, color = '#ffffff', fields = [], level = 'info' }) {
    if (!this.#validateConfig()) return;

    try {
      const embed = this.#formatEmbed({ title, description, color, fields, level });
      const payload = {
        username: 'Glife Security Bot',
        avatar_url: this.defaultAvatar,
        embeds: [embed],
      };

      await axios.post(this.webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('[SUCCÈS] Notification Discord envoyée avec succès');
    } catch (error) {
      console.error('[ERREUR] Erreur lors de l\'envoi de la notification Discord:', error.message);
    }
  }

  /**
   * Log une erreur critique (crash serveur).
   * @param {Error} error - Objet erreur
   * @param {Object} [context={}] - Contexte additionnel
   * @returns {Promise<void>}
   */
  async logCrash(error, context = {}) {
    const fields = [
      {
        name: '[TYPE ERREUR]',
        value: error.name || 'Unknown Error',
        inline: true,
      },
      {
        name: '[MESSAGE]',
        value: error.message || 'Aucun message d\'erreur',
        inline: false,
      },
      {
        name: '[STACK TRACE]',
        value: `\`\`\`\n${(error.stack || 'Non disponible').substring(0, 1000)}${error.stack?.length > 1000 ? '...' : ''}\n\`\`\``,
        inline: false,
      },
      ...(context.route
        ? [{ name: '[ROUTE]', value: `${context.method || 'GET'} ${context.route}`, inline: true }]
        : []),
      ...(context.userId ? [{ name: '[UTILISATEUR]', value: context.userId, inline: true }] : []),
    ];

    await this.sendNotification({
      title: 'CRASH SERVEUR DÉTECTÉ',
      description: 'Une erreur critique a été détectée, le serveur pourrait être instable.',
      color: '#FF0000',
      fields,
      level: 'error',
    });
  }

  /**
   * Log une action échouée.
   * @param {string} action - Nom de l'action
   * @param {Error} error - Objet erreur
   * @param {Object} [context={}] - Contexte additionnel
   * @returns {Promise<void>}
   */
  async logFailedAction(action, error, context = {}) {
    const fields = [
      { name: '[ACTION]', value: action, inline: true },
      { name: '[ERREUR]', value: error.message || 'Erreur inconnue', inline: true },
      ...(context.route
        ? [{ name: '[ROUTE]', value: `${context.method || 'GET'} ${context.route}`, inline: true }]
        : []),
      ...(context.userId ? [{ name: '[UTILISATEUR]', value: context.userId, inline: true }] : []),
      ...(context.companyId ? [{ name: '[ENTREPRISE]', value: context.companyId, inline: true }] : []),
      ...(context.data
        ? [
            {
              name: '[DONNÉES]',
              value: `\`\`\`json\n${JSON.stringify(context.data, null, 2).substring(0, 500)}${
                JSON.stringify(context.data, null, 2).length > 500 ? '...' : ''
              }\n\`\`\``,
              inline: false,
            },
          ]
        : []),
    ];

    await this.sendNotification({
      title: 'ACTION ÉCHOUÉE',
      description: `L'action "${action}" a échoué sur le serveur.`,
      color: '#FFA500',
      fields,
      level: 'warn',
    });
  }

  /**
   * Log une information importante.
   * @param {string} title - Titre de l'information
   * @param {string} message - Message de l'information
   * @param {Object} [context={}] - Contexte additionnel
   * @returns {Promise<void>}
   */
  async logInfo(title, message, context = {}) {
    const fields = [
      ...(context.userId ? [{ name: '[UTILISATEUR]', value: context.userId, inline: true }] : []),
      ...(context.companyId ? [{ name: '[ENTREPRISE]', value: context.companyId, inline: true }] : []),
    ];

    await this.sendNotification({
      title: `${title}`,
      description: message,
      color: '#00FF00',
      fields,
      level: 'info',
    });
  }

  /**
   * Log le démarrage du serveur.
   * @returns {Promise<void>}
   */
  async logServerStart() {
    await this.sendNotification({
      title: '🟢 SERVEUR DÉMARRÉ',
      description: 'Le serveur Glife Compta a démarré avec succès.',
      color: '#00FF00',
      fields: [
        { name: '🔌 Port', value: process.env.PORT || '5000', inline: true },
        {
          name: '🕐 Heure',
          value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
          inline: true,
        },
      ],
      level: 'info',
    });
  }

  /**
   * Log l'arrêt du serveur.
   * @param {string} [reason='Arrêt normal'] - Raison de l'arrêt
   * @returns {Promise<void>}
   */
  async logServerStop(reason = 'Arrêt normal') {
    await this.sendNotification({
      title: '🔴 SERVEUR ARRÊTÉ',
      description: 'Le serveur Glife Compta s\'est arrêté.',
      color: '#FF8C00',
      fields: [
        { name: '📋 Raison', value: reason, inline: true },
        {
          name: '🕐 Heure',
          value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
          inline: true,
        },
      ],
      level: 'warn',
    });
  }

  // ============================================
  // LOGS DE CONNEXION ET AUTHENTIFICATION
  // ============================================

  /**
   * Log une connexion réussie
   * @param {Object} user - Utilisateur connecté
   * @param {Object} req - Requête Express
   */
  async logLogin(user, req) {
    if (!this.#validateConfig()) return;

    const ip = req.ip || req.connection.remoteAddress || 'IP inconnue';
    const userAgent = req.headers['user-agent'] || 'User-Agent inconnu';
    const company = user.company?.name || 'Aucune entreprise';

    await this.sendNotification({
      title: '🔐 CONNEXION RÉUSSIE',
      description: `**${user.username}** s'est connecté à la comptabilité`,
      color: '#00FF00',
      fields: [
        { name: '👤 Utilisateur', value: user.username, inline: true },
        { name: '🏢 Entreprise', value: company, inline: true },
        { name: '🎭 Rôle', value: user.systemRole || 'Employé', inline: true },
        { name: '🌐 IP', value: ip, inline: true },
        { name: '🕐 Heure', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), inline: true },
        { name: '💻 Navigateur', value: userAgent.substring(0, 100), inline: false },
      ],
      level: 'info',
    });
  }

  /**
   * Log une déconnexion
   * @param {Object} user - Utilisateur déconnecté
   * @param {Object} req - Requête Express
   */
  async logLogout(user, req) {
    if (!this.#validateConfig()) return;

    const ip = req.ip || req.connection.remoteAddress || 'IP inconnue';
    const company = user.company?.name || 'Aucune entreprise';

    await this.sendNotification({
      title: '🚪 DÉCONNEXION',
      description: `**${user.username}** s'est déconnecté`,
      color: '#FFA500',
      fields: [
        { name: '👤 Utilisateur', value: user.username, inline: true },
        { name: '🏢 Entreprise', value: company, inline: true },
        { name: '🌐 IP', value: ip, inline: true },
        { name: '🕐 Heure', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), inline: true },
      ],
      level: 'info',
    });
  }

  /**
   * Log une tentative de connexion échouée
   * @param {string} username - Nom d'utilisateur tenté
   * @param {Object} req - Requête Express
   * @param {string} reason - Raison de l'échec
   */
  async logFailedLogin(username, req, reason = 'Identifiants incorrects') {
    if (!this.#validateConfig()) return;

    const ip = req.ip || req.connection.remoteAddress || 'IP inconnue';
    const userAgent = req.headers['user-agent'] || 'User-Agent inconnu';

    await this.sendNotification({
      title: '⚠️ TENTATIVE DE CONNEXION ÉCHOUÉE',
      description: `Tentative de connexion échouée pour **${username}**`,
      color: '#FF0000',
      fields: [
        { name: '👤 Utilisateur', value: username, inline: true },
        { name: '❌ Raison', value: reason, inline: true },
        { name: '🌐 IP', value: ip, inline: true },
        { name: '🕐 Heure', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), inline: true },
        { name: '💻 Navigateur', value: userAgent.substring(0, 100), inline: false },
      ],
      level: 'warn',
    });
  }

  // ============================================
  // LOGS DE SÉCURITÉ ET INFILTRATIONS
  // ============================================

  /**
   * Log un accès non autorisé
   * @param {Object} req - Requête Express
   * @param {string} resource - Ressource tentée
   * @param {Object} user - Utilisateur (si authentifié)
   */
  async logUnauthorizedAccess(req, resource, user = null) {
    if (!this.#validateConfig()) return;

    const ip = req.ip || req.connection.remoteAddress || 'IP inconnue';
    const userAgent = req.headers['user-agent'] || 'User-Agent inconnu';
    const method = req.method || 'GET';
    const url = req.originalUrl || req.url || 'URL inconnue';

    await axios.post(this.securityWebhook, {
      username: 'Glife Security Alert',
      avatar_url: this.defaultAvatar,
      embeds: [{
        title: '🚨 ACCÈS NON AUTORISÉ DÉTECTÉ',
        description: `Tentative d'accès à une ressource protégée sans autorisation`,
        color: parseInt('FF0000', 16),
        fields: [
          { name: '🎯 Ressource', value: resource, inline: true },
          { name: '📍 Route', value: `${method} ${url}`, inline: false },
          { name: '👤 Utilisateur', value: user ? user.username : 'Non authentifié', inline: true },
          { name: '🏢 Entreprise', value: user?.company?.name || 'N/A', inline: true },
          { name: '🌐 IP', value: ip, inline: true },
          { name: '🕐 Heure', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), inline: true },
          { name: '💻 User-Agent', value: userAgent.substring(0, 100), inline: false },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Glife Security System - ALERTE SÉCURITÉ',
          icon_url: this.defaultAvatar,
        },
      }],
    });
  }

  /**
   * Log une tentative d'injection SQL ou XSS
   * @param {Object} req - Requête Express
   * @param {string} attackType - Type d'attaque détecté
   * @param {string} payload - Payload malveillant
   */
  async logSecurityThreat(req, attackType, payload) {
    if (!this.#validateConfig()) return;

    const ip = req.ip || req.connection.remoteAddress || 'IP inconnue';
    const userAgent = req.headers['user-agent'] || 'User-Agent inconnu';
    const method = req.method || 'GET';
    const url = req.originalUrl || req.url || 'URL inconnue';

    await axios.post(this.securityWebhook, {
      username: 'Glife Security Alert',
      avatar_url: this.defaultAvatar,
      embeds: [{
        title: '🛡️ MENACE DE SÉCURITÉ DÉTECTÉE',
        description: `**ATTAQUE ${attackType.toUpperCase()} DÉTECTÉE**\n⚠️ Tentative d'intrusion bloquée`,
        color: parseInt('8B0000', 16),
        fields: [
          { name: '⚔️ Type d\'attaque', value: attackType, inline: true },
          { name: '📍 Route', value: `${method} ${url}`, inline: false },
          { name: '💣 Payload', value: `\`\`\`\n${payload.substring(0, 500)}\n\`\`\``, inline: false },
          { name: '🌐 IP', value: ip, inline: true },
          { name: '🕐 Heure', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), inline: true },
          { name: '💻 User-Agent', value: userAgent.substring(0, 100), inline: false },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: '🚨 ALERTE CRITIQUE - Action immédiate requise',
          icon_url: this.defaultAvatar,
        },
      }],
    });
  }

  /**
   * Log une tentative de vol de données
   * @param {Object} req - Requête Express
   * @param {Object} user - Utilisateur
   * @param {string} dataType - Type de données tentées
   * @param {number} recordCount - Nombre d'enregistrements
   */
  async logDataTheftAttempt(req, user, dataType, recordCount) {
    if (!this.#validateConfig()) return;

    const ip = req.ip || req.connection.remoteAddress || 'IP inconnue';
    const method = req.method || 'GET';
    const url = req.originalUrl || req.url || 'URL inconnue';

    await axios.post(this.securityWebhook, {
      username: 'Glife Security Alert',
      avatar_url: this.defaultAvatar,
      embeds: [{
        title: '🚨 TENTATIVE DE VOL DE DONNÉES',
        description: `**ALERTE CRITIQUE** - Tentative d'extraction massive de données détectée`,
        color: parseInt('8B0000', 16),
        fields: [
          { name: '👤 Utilisateur', value: user.username, inline: true },
          { name: '🏢 Entreprise', value: user.company?.name || 'N/A', inline: true },
          { name: '📊 Type de données', value: dataType, inline: true },
          { name: '📈 Nombre d\'enregistrements', value: recordCount.toString(), inline: true },
          { name: '📍 Route', value: `${method} ${url}`, inline: false },
          { name: '🌐 IP', value: ip, inline: true },
          { name: '🕐 Heure', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: '🚨 ALERTE CRITIQUE - Vérification immédiate requise',
          icon_url: this.defaultAvatar,
        },
      }],
    });
  }

  /**
   * Log un changement d'entreprise
   * @param {Object} user - Utilisateur
   * @param {string} oldCompany - Ancienne entreprise
   * @param {string} newCompany - Nouvelle entreprise
   * @param {Object} req - Requête Express
   */
  async logCompanySwitch(user, oldCompany, newCompany, req) {
    if (!this.#validateConfig()) return;

    const ip = req.ip || req.connection.remoteAddress || 'IP inconnue';

    await this.sendNotification({
      title: '🔄 CHANGEMENT D\'ENTREPRISE',
      description: `**${user.username}** a changé d'entreprise`,
      color: '#3498db',
      fields: [
        { name: '👤 Utilisateur', value: user.username, inline: true },
        { name: '🎭 Rôle', value: user.systemRole || 'Employé', inline: true },
        { name: '🏢 Ancienne', value: oldCompany || 'Aucune', inline: true },
        { name: '🏢 Nouvelle', value: newCompany || 'Aucune', inline: true },
        { name: '🌐 IP', value: ip, inline: true },
        { name: '🕐 Heure', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), inline: true },
      ],
      level: 'info',
    });
  }

  /**
   * Log une action sensible (suppression, modification critique)
   * @param {Object} user - Utilisateur
   * @param {string} action - Action effectuée
   * @param {string} target - Cible de l'action
   * @param {Object} req - Requête Express
   */
  async logSensitiveAction(user, action, target, req) {
    if (!this.#validateConfig()) return;

    const ip = req.ip || req.connection.remoteAddress || 'IP inconnue';
    const method = req.method || 'POST';
    const url = req.originalUrl || req.url || 'URL inconnue';

    await this.sendNotification({
      title: '⚠️ ACTION SENSIBLE',
      description: `**${user.username}** a effectué une action sensible`,
      color: '#FF8C00',
      fields: [
        { name: '👤 Utilisateur', value: user.username, inline: true },
        { name: '🏢 Entreprise', value: user.company?.name || 'N/A', inline: true },
        { name: '🎯 Action', value: action, inline: true },
        { name: '📋 Cible', value: target, inline: true },
        { name: '📍 Route', value: `${method} ${url}`, inline: false },
        { name: '🌐 IP', value: ip, inline: true },
        { name: '🕐 Heure', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), inline: true },
      ],
      level: 'warn',
    });
  }

  /**
   * Log une activité suspecte (trop de requêtes, pattern anormal)
   * @param {Object} req - Requête Express
   * @param {string} reason - Raison de la suspicion
   * @param {Object} details - Détails supplémentaires
   */
  async logSuspiciousActivity(req, reason, details = {}) {
    if (!this.#validateConfig()) return;

    const ip = req.ip || req.connection.remoteAddress || 'IP inconnue';
    const userAgent = req.headers['user-agent'] || 'User-Agent inconnu';

    await axios.post(this.securityWebhook, {
      username: 'Glife Security Alert',
      avatar_url: this.defaultAvatar,
      embeds: [{
        title: '👁️ ACTIVITÉ SUSPECTE DÉTECTÉE',
        description: `Comportement anormal détecté sur le système`,
        color: parseInt('FFA500', 16),
        fields: [
          { name: '⚠️ Raison', value: reason, inline: false },
          { name: '🌐 IP', value: ip, inline: true },
          { name: '🕐 Heure', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), inline: true },
          { name: '💻 User-Agent', value: userAgent.substring(0, 100), inline: false },
          ...(details.requestCount ? [{ name: '📊 Nombre de requêtes', value: details.requestCount.toString(), inline: true }] : []),
          ...(details.timeWindow ? [{ name: '⏱️ Fenêtre de temps', value: details.timeWindow, inline: true }] : []),
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Glife Security System - Surveillance active',
          icon_url: this.defaultAvatar,
        },
      }],
    });
  }
}

// Exporte une instance singleton
module.exports = new DiscordLogger();