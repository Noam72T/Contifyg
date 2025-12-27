// Service global pour les alertes sonores des timers expirés
class AlertService {
  private alertIntervals: Map<string, NodeJS.Timeout> = new Map();
  private expiredTimers: Set<string> = new Set();
  private readonly STORAGE_KEY = 'timer_expired_sessions';

  constructor() {
    // Restaurer les timers expirés depuis localStorage
    this.loadExpiredTimers();
    // Redémarrer les alertes pour les timers expirés
    this.restartAlertsOnLoad();
  }

  // Sauvegarder les timers expirés dans localStorage
  private saveExpiredTimers() {
    const expiredData = Array.from(this.expiredTimers).map(sessionId => ({
      sessionId,
      expiredAt: Date.now()
    }));
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(expiredData));
  }

  // Charger les timers expirés depuis localStorage
  private loadExpiredTimers() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const expiredData = JSON.parse(stored);
        expiredData.forEach((item: any) => {
          this.expiredTimers.add(item.sessionId);
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des timers expirés:', error);
    }
  }

  // Redémarrer les alertes au chargement de la page
  private restartAlertsOnLoad() {
    this.expiredTimers.forEach(sessionId => {
      console.log(`🔄 Redémarrage alerte pour session ${sessionId}`);
      this.startAlertInternal(sessionId, 'Timer expiré');
    });
  }

  // Démarrer l'alerte pour un timer expiré
  startAlert(sessionId: string, vehicleName: string) {
    if (this.expiredTimers.has(sessionId)) {
      return; // Alerte déjà active
    }

    this.expiredTimers.add(sessionId);
    this.saveExpiredTimers();
    console.log(`🚨 Démarrage alerte pour ${vehicleName} (${sessionId})`);
    
    this.startAlertInternal(sessionId, vehicleName);
  }

  // Logique interne pour démarrer l'alerte
  private startAlertInternal(_sessionId: string, _vehicleName: string) {
    const playAlertSound = () => {
      // Son d'alerte synthétique - un seul bip
      try {
        // Utiliser Web Audio API pour un son plus fort
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Fréquence élevée
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volume
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3); // Bip de 0.3 seconde
      } catch (error) {
        // Fallback vers l'ancien son si Web Audio ne fonctionne pas
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuH0fPTgzMGHm7A7+OZURE');
        audio.volume = 1.0;
        audio.play().catch(() => {});
      }
    };

    // Jouer un seul bip immédiatement
    playAlertSound();
    
    // Marquer comme alerté mais ne pas répéter
    // (L'alerte visuelle reste active jusqu'à ce que l'utilisateur arrête le timer)
  }

  // Arrêter l'alerte pour un timer
  stopAlert(sessionId: string) {
    const interval = this.alertIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.alertIntervals.delete(sessionId);
    }
    this.expiredTimers.delete(sessionId);
    this.saveExpiredTimers(); // Mettre à jour localStorage
    console.log(`🔇 Arrêt alerte pour ${sessionId}`);
  }

  // Vérifier si un timer a une alerte active
  hasAlert(sessionId: string): boolean {
    return this.expiredTimers.has(sessionId);
  }

  // Nettoyer toutes les alertes
  clearAllAlerts() {
    this.alertIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.alertIntervals.clear();
    this.expiredTimers.clear();
    console.log('🔇 Toutes les alertes arrêtées');
  }
}

// Instance globale
export const alertService = new AlertService();

// Nettoyer les alertes quand la page se ferme
window.addEventListener('beforeunload', () => {
  alertService.clearAllAlerts();
});
