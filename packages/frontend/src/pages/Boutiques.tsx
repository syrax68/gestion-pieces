import { useState, useEffect } from "react";
import { boutiquesApi, authApi, Boutique, User } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/Dialog";
import { Select } from "../components/ui/Select";
import {
  Plus,
  Pencil,
  Trash2,
  Store,
  Users,
  Package,
  FileText,
  Contact,
  Loader2,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { useToast } from "@/components/ui/Toaster";

interface BoutiqueFormData {
  nom: string;
  adresse: string;
  ville: string;
  telephone: string;
  email: string;
  siret: string;
}

const emptyForm: BoutiqueFormData = {
  nom: "",
  adresse: "",
  ville: "",
  telephone: "",
  email: "",
  siret: "",
};

export default function Boutiques() {
  const { error: toastError } = useToast();
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBoutique, setEditingBoutique] = useState<Boutique | null>(null);
  const [formData, setFormData] = useState<BoutiqueFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Dialog assignation utilisateur
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignBoutique, setAssignBoutique] = useState<Boutique | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const loadData = async () => {
    try {
      const [boutiquesData, usersData] = await Promise.all([boutiquesApi.getAll(), authApi.getUsers()]);
      setBoutiques(boutiquesData);
      setUsers(usersData);
    } catch (err) {
      console.error("Error loading boutiques:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateDialog = () => {
    setEditingBoutique(null);
    setFormData(emptyForm);
    setError("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (boutique: Boutique) => {
    setEditingBoutique(boutique);
    setFormData({
      nom: boutique.nom,
      adresse: boutique.adresse || "",
      ville: boutique.ville || "",
      telephone: boutique.telephone || "",
      email: boutique.email || "",
      siret: boutique.siret || "",
    });
    setError("");
    setIsDialogOpen(true);
  };

  const openAssignDialog = (boutique: Boutique) => {
    setAssignBoutique(boutique);
    setSelectedUserId("");
    setIsAssignDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      if (editingBoutique) {
        await boutiquesApi.update(editingBoutique.id, formData);
      } else {
        await boutiquesApi.create(formData);
      }
      setIsDialogOpen(false);
      loadData();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Une erreur est survenue");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (boutique: Boutique) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la boutique "${boutique.nom}" ?`)) return;

    try {
      await boutiquesApi.delete(boutique.id);
      loadData();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toastError(error.message || "Erreur lors de la suppression");
    }
  };

  const handleAssignUser = async () => {
    if (!selectedUserId || !assignBoutique) return;
    setIsAssigning(true);
    try {
      await authApi.updateUser(selectedUserId, { boutiqueId: assignBoutique.id });
      setIsAssignDialogOpen(false);
      loadData();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toastError(error.message || "Erreur lors de l'assignation");
    } finally {
      setIsAssigning(false);
    }
  };

  const getUsersForBoutique = (boutiqueId: string) => users.filter((u) => u.boutiqueId === boutiqueId);

  const getUnassignedOrOtherUsers = (boutiqueId: string) =>
    users.filter((u) => u.boutiqueId !== boutiqueId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des boutiques</h1>
          <p className="text-slate-500 dark:text-slate-400">Créez et gérez vos points de vente</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle boutique
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {boutiques.map((boutique) => {
          const boutiqueUsers = getUsersForBoutique(boutique.id);
          return (
            <Card key={boutique.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-slate-600" />
                    <div>
                      <CardTitle className="text-lg">{boutique.nom}</CardTitle>
                      {boutique.ville && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {boutique.ville}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={boutique.actif ? "success" : "secondary"}>
                    {boutique.actif ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Infos contact */}
                <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
                  {boutique.telephone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3 w-3" /> {boutique.telephone}
                    </p>
                  )}
                  {boutique.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="h-3 w-3" /> {boutique.email}
                    </p>
                  )}
                  {boutique.siret && <p className="text-xs">SIRET: {boutique.siret}</p>}
                </div>

                {/* Compteurs */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Users className="h-3.5 w-3.5 text-blue-500" />
                    <span>{boutique._count?.users ?? boutiqueUsers.length} utilisateurs</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Package className="h-3.5 w-3.5 text-green-500" />
                    <span>{boutique._count?.pieces ?? 0} pièces</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <FileText className="h-3.5 w-3.5 text-orange-500" />
                    <span>{boutique._count?.factures ?? 0} factures</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Contact className="h-3.5 w-3.5 text-purple-500" />
                    <span>{boutique._count?.clients ?? 0} clients</span>
                  </div>
                </div>

                {/* Utilisateurs assignés */}
                {boutiqueUsers.length > 0 && (
                  <div className="border-t pt-2">
                    <p className="text-xs font-medium text-slate-500 mb-1">Utilisateurs :</p>
                    <div className="flex flex-wrap gap-1">
                      {boutiqueUsers.map((u) => (
                        <Badge key={u.id} variant="secondary" className="text-xs">
                          {u.nom} ({u.role})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => openAssignDialog(boutique)}>
                    <Users className="h-3.5 w-3.5 mr-1" />
                    Assigner
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(boutique)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(boutique)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {boutiques.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Store className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p>Aucune boutique. Créez votre première boutique.</p>
        </div>
      )}

      {/* Dialog Create/Edit Boutique */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBoutique ? "Modifier la boutique" : "Nouvelle boutique"}</DialogTitle>
            <DialogDescription>
              {editingBoutique
                ? "Modifiez les informations de la boutique"
                : "Ajoutez un nouveau point de vente"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nom">Nom de la boutique *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Boutique Paris"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  placeholder="12 rue de la Moto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ville">Ville</Label>
                <Input
                  id="ville"
                  value={formData.ville}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  placeholder="Paris"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  placeholder="01 23 45 67 89"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@boutique.fr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siret">SIRET</Label>
              <Input
                id="siret"
                value={formData.siret}
                onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                placeholder="123 456 789 00012"
              />
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
                ) : editingBoutique ? (
                  "Mettre à jour"
                ) : (
                  "Créer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Assigner Utilisateur */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner un utilisateur</DialogTitle>
            <DialogDescription>
              Assigner un utilisateur à la boutique "{assignBoutique?.nom}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Utilisateurs déjà assignés */}
            {assignBoutique && getUsersForBoutique(assignBoutique.id).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Utilisateurs actuels :</p>
                <div className="space-y-1">
                  {getUsersForBoutique(assignBoutique.id).map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <span className="text-sm">
                        {u.nom} {u.prenom} — <span className="text-slate-500">{u.email}</span>
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {u.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sélection nouvel utilisateur */}
            <div className="space-y-2">
              <Label>Ajouter un utilisateur</Label>
              {assignBoutique && getUnassignedOrOtherUsers(assignBoutique.id).length > 0 ? (
                <Select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                  <option value="">Sélectionner un utilisateur...</option>
                  {getUnassignedOrOtherUsers(assignBoutique.id).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nom} {u.prenom || ""} ({u.role})
                      {u.boutiqueId ? " - actuellement dans une autre boutique" : ""}
                    </option>
                  ))}
                </Select>
              ) : (
                <p className="text-sm text-slate-500">Tous les utilisateurs sont déjà assignés à cette boutique.</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Fermer
              </Button>
              <Button onClick={handleAssignUser} disabled={!selectedUserId || isAssigning}>
                {isAssigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assignation...
                  </>
                ) : (
                  "Assigner"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
