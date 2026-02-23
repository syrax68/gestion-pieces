import { useState, useEffect, useRef } from 'react';
import { authApi, User } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/Dialog';
import { Select } from '../components/ui/Select';
import { Plus, Pencil, Trash2, User as UserIcon, Shield, Eye, Loader2, Camera } from 'lucide-react';
import { useToast } from "@/components/ui/Toaster";

const API_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3001";
const mediaUrl = (url: string) => (url.startsWith("http") ? url : `${API_BASE}${url}`);

export default function Users() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nom: '',
    prenom: '',
    role: 'VENDEUR' as 'SUPER_ADMIN' | 'ADMIN' | 'VENDEUR' | 'LECTEUR'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const loadUsers = async () => {
    try {
      const data = await authApi.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({ email: '', password: '', nom: '', prenom: '', role: 'VENDEUR' });
    setError('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      nom: user.nom,
      prenom: user.prenom || '',
      role: user.role
    });
    setError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      if (editingUser) {
        const updateData: Record<string, string> = {
          nom: formData.nom,
          prenom: formData.prenom,
          role: formData.role
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await authApi.updateUser(editingUser.id, updateData);
      } else {
        if (!formData.password) {
          setError('Le mot de passe est requis');
          setIsSaving(false);
          return;
        }
        await authApi.register(formData);
      }
      setIsDialogOpen(false);
      loadUsers();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Une erreur est survenue');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingUser) return;
    try {
      setUploadingAvatar(true);
      const updated = await authApi.uploadAvatar(editingUser.id, file);
      setEditingUser(updated);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, photo: updated.photo } : u)));
      toastSuccess?.('Photo mise à jour');
    } catch (err: unknown) {
      const error = err as { message?: string };
      toastError(error.message || "Erreur lors de l'upload");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.nom} ?`)) {
      return;
    }

    try {
      await authApi.deleteUser(user.id);
      loadUsers();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toastError(error.message || 'Erreur lors de la suppression');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge variant="destructive" className="flex items-center gap-1"><Shield className="h-3 w-3" /> Super Admin</Badge>;
      case 'ADMIN':
        return <Badge variant="destructive" className="flex items-center gap-1"><Shield className="h-3 w-3" /> Admin</Badge>;
      case 'VENDEUR':
        return <Badge variant="default" className="flex items-center gap-1"><UserIcon className="h-3 w-3" /> Vendeur</Badge>;
      case 'LECTEUR':
        return <Badge variant="secondary" className="flex items-center gap-1"><Eye className="h-3 w-3" /> Lecteur</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des utilisateurs</h1>
          <p className="text-slate-500 dark:text-slate-400">Gérez les comptes et les permissions</p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel utilisateur
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={user.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-muted border-2 border-background shadow-sm">
                    {user.photo ? (
                      <img src={mediaUrl(user.photo)} alt={user.nom} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-semibold text-lg">
                        {user.nom.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base truncate">
                    {user.nom} {user.prenom}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                {getRoleBadge(user.role)}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Créé le {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(user)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Modifiez les informations de l\'utilisateur'
                : 'Créez un nouveau compte utilisateur'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar upload (edit only) */}
            {editingUser && (
              <div className="flex justify-center">
                <div className="relative group">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <div className="h-20 w-20 rounded-full overflow-hidden bg-muted border-2 border-muted shadow-md">
                    {editingUser.photo ? (
                      <img src={mediaUrl(editingUser.photo)} alt={editingUser.nom} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-2xl">
                        {editingUser.nom.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md text-sm">
                {error}
              </div>
            )}

            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Mot de passe {editingUser && '(laisser vide pour ne pas changer)'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'SUPER_ADMIN' | 'ADMIN' | 'VENDEUR' | 'LECTEUR' })}
              >
                <option value="SUPER_ADMIN">Super Admin - Gestion multi-boutiques</option>
                <option value="ADMIN">Admin - Accès complet boutique</option>
                <option value="VENDEUR">Vendeur - Création et modification</option>
                <option value="LECTEUR">Lecteur - Lecture seule</option>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  editingUser ? 'Mettre à jour' : 'Créer'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
