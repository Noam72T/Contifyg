import api from './api';

export const recalculateAllVentes = async (): Promise<{ success: boolean; message: string; updated?: number }> => {
  try {
    const response = await api.post('/ventes/recalculate-all');
    
    if (response.data) {
      return {
        success: true,
        message: response.data.message,
        updated: response.data.updated
      };
    }
    
    return {
      success: false,
      message: 'Erreur lors du recalcul des ventes'
    };
  } catch (error: any) {
    console.error('Erreur lors du recalcul des ventes:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Erreur serveur lors du recalcul'
    };
  }
};
