import React, { useState, useEffect } from 'react';
import { X, Save, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface Permission {
  _id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
}

interface Role {
  _id: string;
  nom: string;
  permissions?: Permission[];
}

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  onRoleUpdated: () => void;
}

const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({
  isOpen,
  onClose,
  role,
  onRoleUpdated
}) => {
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && role) {
      fetchPermissions();
      setSelectedPermissions(role.permissions?.map(p => p._id) || []);
    }
  }, [isOpen, role]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/permissions');
      if (response.data.success) {
        setAvailablePermissions(response.data.permissions);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des permissions:', error);
      toast.error('Erreur lors du chargement des permissions');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSave = async () => {
    if (!role) return;

    try {
      setSaving(true);
      const response = await api.put(`/roles/${role._id}/permissions`, {
        permissions: selectedPermissions
      });

      if (response.data.success) {
        toast.success('Permissions mises à jour avec succès');
        onRoleUpdated();
        onClose();
      }
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour des permissions:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = availablePermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (!isOpen || !role) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Permissions du rôle
              </h2>
              <p className="text-sm text-gray-500">
                {role.nom}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([category, permissions]) => (
                <div key={category} className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 capitalize">
                    {category.toLowerCase()}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.map((permission) => (
                      <label
                        key={permission._id}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission._id)}
                          onChange={() => handlePermissionToggle(permission._id)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">
                            {permission.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {permission.code}
                          </div>
                          {permission.description && (
                            <div className="text-xs text-gray-400 mt-1">
                              {permission.description}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionsModal;
