import React from 'react';
import { X, Car, Trash2, Plus } from 'lucide-react';

interface CustomizationItem {
  partName: string;
  partDisplayName: string;
  color?: string;
  modification?: {
    name: string;
    price: number;
    description: string;
  };
  price: number;
}

interface CustomizationCartProps {
  isOpen: boolean;
  onClose: () => void;
  customizations: Record<string, CustomizationItem>;
  onRemoveCustomization: (partName: string) => void;
  onAddToMainCart: () => void;
}

const CustomizationCart: React.FC<CustomizationCartProps> = ({
  isOpen,
  onClose,
  customizations,
  onRemoveCustomization,
  onAddToMainCart
}) => {
  if (!isOpen) return null;

  const customizationsList = Object.values(customizations);
  const totalPrice = customizationsList.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center">
            <Car className="h-5 w-5 mr-2" />
            Personnalisations Véhicule
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {customizationsList.length === 0 ? (
            <div className="text-center py-12">
              <Car className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucune personnalisation
              </h3>
              <p className="text-muted-foreground">
                Cliquez sur les parties de la voiture pour commencer la personnalisation
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {customizationsList.map((item) => (
                <div
                  key={item.partName}
                  className="bg-muted rounded-lg p-4 border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">
                        {item.partDisplayName}
                      </h3>
                      
                      <div className="space-y-1 text-sm">
                        {item.color && (
                          <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground">Couleur:</span>
                            <div 
                              className="w-4 h-4 rounded border border-border"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-foreground">Personnalisée</span>
                          </div>
                        )}
                        
                        {item.modification && (
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-muted-foreground">Modification:</span>
                              <span className="text-foreground font-medium">
                                {item.modification.name}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.modification.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 ml-4">
                      <span className="text-lg font-bold text-primary">
                        ${item.price}
                      </span>
                      <button
                        onClick={() => onRemoveCustomization(item.partName)}
                        className="text-destructive hover:text-destructive/80 p-1"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {customizationsList.length > 0 && (
          <div className="border-t border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-foreground">
                Total des personnalisations:
              </span>
              <span className="text-2xl font-bold text-primary">
                ${totalPrice}
              </span>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 bg-muted text-foreground py-3 px-4 rounded-lg hover:bg-muted/80 transition-colors"
              >
                Continuer la personnalisation
              </button>
              <button
                onClick={() => {
                  onAddToMainCart();
                  onClose();
                }}
                className="flex-1 bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter au panier principal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomizationCart;
