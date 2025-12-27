import React from 'react';
import { X, Palette, Settings, Zap } from 'lucide-react';

interface PartCustomizerProps {
  selectedPart: string | null;
  onClose: () => void;
  onApplyCustomization: (partName: string, customization: any) => void;
  currentCustomization: any;
}

const PartCustomizer: React.FC<PartCustomizerProps> = ({
  selectedPart,
  onClose,
  onApplyCustomization,
  currentCustomization
}) => {
  if (!selectedPart) return null;

  const colors = [
    { name: 'Rouge', value: '#ff4444' },
    { name: 'Bleu', value: '#4444ff' },
    { name: 'Vert', value: '#44ff44' },
    { name: 'Jaune', value: '#ffff44' },
    { name: 'Violet', value: '#ff44ff' },
    { name: 'Orange', value: '#ff8844' },
    { name: 'Noir', value: '#222222' },
    { name: 'Blanc', value: '#ffffff' },
    { name: 'Argent', value: '#c0c0c0' },
    { name: 'Or', value: '#ffd700' }
  ];

  const modifications = {
    capot: [
      { name: 'Capot Sport', price: 500, description: 'Capot en fibre de carbone' },
      { name: 'Capot Ventilé', price: 750, description: 'Capot avec évents d\'air' },
      { name: 'Capot LED', price: 1200, description: 'Capot avec éclairage LED' }
    ],
    chassis: [
      { name: 'Kit Carrosserie Sport', price: 2000, description: 'Kit carrosserie aérodynamique' },
      { name: 'Extension Bas de caisse', price: 800, description: 'Extensions latérales sport' }
    ],
    roues: [
      { name: 'Pneus Sport', price: 400, description: 'Pneus haute performance' },
      { name: 'Pneus Racing', price: 800, description: 'Pneus de course' }
    ],
    jantes: [
      { name: 'Jantes Alu 18"', price: 600, description: 'Jantes alliage 18 pouces' },
      { name: 'Jantes Carbone 19"', price: 1500, description: 'Jantes carbone 19 pouces' },
      { name: 'Jantes Forgées 20"', price: 2500, description: 'Jantes forgées 20 pouces' }
    ],
    pare_chocs_avant: [
      { name: 'Pare-chocs Sport', price: 800, description: 'Pare-chocs aérodynamique avant' },
      { name: 'Pare-chocs Racing', price: 1200, description: 'Pare-chocs racing avec splitter' }
    ],
    pare_chocs_arriere: [
      { name: 'Pare-chocs Sport', price: 800, description: 'Pare-chocs aérodynamique arrière' },
      { name: 'Diffuseur Carbon', price: 1500, description: 'Diffuseur en fibre de carbone' }
    ],
    aileron: [
      { name: 'Aileron Sport', price: 600, description: 'Aileron aérodynamique' },
      { name: 'Aileron Racing', price: 1200, description: 'Aileron de course réglable' },
      { name: 'Supprimer Aileron', price: 0, description: 'Retirer l\'aileron' }
    ]
  };

  const partNames: Record<string, string> = {
    capot: 'Capot',
    chassis: 'Carrosserie',
    toit: 'Toit',
    roues: 'Pneus',
    jantes: 'Jantes',
    pare_chocs_avant: 'Pare-chocs avant',
    pare_chocs_arriere: 'Pare-chocs arrière',
    aileron: 'Aileron'
  };

  const handleColorChange = (color: string) => {
    onApplyCustomization(selectedPart, {
      ...currentCustomization,
      color
    });
  };

  const handleModificationSelect = (modification: any) => {
    onApplyCustomization(selectedPart, {
      ...currentCustomization,
      modification,
      price: modification.price
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Personnaliser - {partNames[selectedPart]}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sélection de couleur */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
            <Palette className="h-4 w-4 mr-2" />
            Couleur
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => handleColorChange(color.value)}
                className={`w-12 h-12 rounded-lg border-2 transition-all hover:scale-110 ${
                  currentCustomization?.color === color.value
                    ? 'border-primary ring-2 ring-primary/50'
                    : 'border-border hover:border-primary/50'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* Modifications disponibles */}
        {modifications[selectedPart as keyof typeof modifications] && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Modifications
            </h3>
            <div className="space-y-2">
              {modifications[selectedPart as keyof typeof modifications].map((mod, index) => (
                <button
                  key={index}
                  onClick={() => handleModificationSelect(mod)}
                  className={`w-full p-3 rounded-lg border text-left transition-all hover:bg-muted ${
                    currentCustomization?.modification?.name === mod.name
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-foreground">{mod.name}</h4>
                      <p className="text-sm text-muted-foreground">{mod.description}</p>
                    </div>
                    <span className="text-lg font-bold text-primary">${mod.price}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Récapitulatif */}
        {currentCustomization && (
          <div className="bg-muted rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-2">Récapitulatif</h4>
            <div className="space-y-1 text-sm">
              {currentCustomization.color && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Couleur:</span>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: currentCustomization.color }}
                    />
                    <span className="text-foreground">Personnalisée</span>
                  </div>
                </div>
              )}
              {currentCustomization.modification && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modification:</span>
                  <span className="text-foreground">{currentCustomization.modification.name}</span>
                </div>
              )}
              {currentCustomization.price !== undefined && (
                <div className="flex justify-between font-semibold border-t border-border pt-2 mt-2">
                  <span className="text-foreground">Total:</span>
                  <span className="text-primary">${currentCustomization.price || 0}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-muted text-foreground py-2 px-4 rounded-lg hover:bg-muted/80 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartCustomizer;
