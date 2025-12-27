import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../utils/api';

interface Permission {
  _id: string;
  name: string;
  code: string;
  description: string;
  module: string;
  category: string;
}

interface Role {
  _id: string;
  nom: string;
  permissions: string[];
}

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  onSave: (roleId: string, permissions: string[]) => void;
}

const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({
  isOpen,
  onClose,
  role,
  onSave
}) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Grouper les permissions par catégorie
  const permissionsByCategory = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const categories = [
    { key: 'GENERALE', name: 'Général', color: 'bg-blue-500', icon: '📊' },
    { key: 'PAPERASSE', name: 'Paperasse', color: 'bg-green-500', icon: '📄' },
    { key: 'ADMINISTRATION', name: 'Administration', color: 'bg-orange-500', icon: '👥' },
    { key: 'GESTION', name: 'Gestion', color: 'bg-purple-500', icon: '⚙️' }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchPermissions();
      if (role) {
        setSelectedPermissions(role.permissions || []);
      }
    }
  }, [isOpen, role]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/permissions');
      setPermissions(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (category: string) => {
    const categoryPermissions = permissionsByCategory[category] || [];
    const categoryPermissionIds = categoryPermissions.map(p => p._id);
    
    const allSelected = categoryPermissionIds.every(id => selectedPermissions.includes(id));
    
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !categoryPermissionIds.includes(id)));
    } else {
      setSelectedPermissions(prev => {
        const newSelected = [...prev];
        categoryPermissionIds.forEach(id => {
          if (!newSelected.includes(id)) {
            newSelected.push(id);
          }
        });
        return newSelected;
      });
    }
  };

  const handleSave = () => {
    if (role) {
      onSave(role._id, selectedPermissions);
      onClose();
    }
  };

  if (!isOpen || !role) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Permissions - {role.nom}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map(category => {
              const categoryPermissions = permissionsByCategory[category.key] || [];
              if (categoryPermissions.length === 0) return null;

              const allSelected = categoryPermissions.every(p => selectedPermissions.includes(p._id));
              const someSelected = categoryPermissions.some(p => selectedPermissions.includes(p._id));

              return (
                <div key={category.key} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{category.icon}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">{category.name}</h3>
                      <p className="text-xs text-gray-500">{categoryPermissions.length} permissions</p>
                    </div>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => handleCategoryToggle(category.key)}
                      className="sr-only peer"
                    />
                    <div className={`relative w-10 h-6 rounded-full peer transition-colors ${
                      allSelected 
                        ? 'bg-blue-600' 
                        : someSelected 
                          ? 'bg-blue-300' 
                          : 'bg-gray-200'
                    }`}>
                      <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                        allSelected ? 'translate-x-full border-white' : ''
                      }`}></div>
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-secondary-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionsModal;
