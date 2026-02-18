import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Truck, Plus, Search, Pencil, Trash2, Loader2, Phone, Mail, MapPin, Package } from "lucide-react";
import { Fournisseur, fournisseursApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toaster";

export default function Fournisseurs() {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const isAdmin = user?.role === "ADMIN";
  const isVendeurOrAdmin = user?.role === "ADMIN" || user?.role === "VENDEUR";

  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null);
  const [saving, setSaving] = useState(false);

  // Formulaire
  const [form, setForm] = useState({
    nom: "",
    contact: "",
    email: "",
    telephone: "",
    adresse: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fournisseursApi.getAll();
      setFournisseurs(data);
    } catch (err) {
      setError("Erreur lors du chargement des fournisseurs");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ nom: "", contact: "", email: "", telephone: "", adresse: "", notes: "" });
    setEditingFournisseur(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (fournisseur: Fournisseur) => {
    setEditingFournisseur(fournisseur);
    setForm({
      nom: fournisseur.nom || "",
      contact: fournisseur.contact || "",
      email: fournisseur.email || "",
      telephone: fournisseur.telephone || "",
      adresse: fournisseur.adresse || "",
      notes: fournisseur.notes || "",
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim()) {
      toastError("Le nom est requis");
      return;
    }

    try {
      setSaving(true);
      if (editingFournisseur) {
        await fournisseursApi.update(editingFournisseur.id, form);
      } else {
        await fournisseursApi.create(form);
      }
      await loadData();
      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toastError("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fournisseur: Fournisseur) => {
    if (!confirm(`Supprimer le fournisseur "${fournisseur.nom}" ?`)) return;
    try {
      await fournisseursApi.delete(fournisseur.id);
      await loadData();
    } catch (err) {
      console.error(err);
      toastError("Erreur lors de la suppression");
    }
  };

  const filteredFournisseurs = fournisseurs.filter(
    (f) =>
      f.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.contact || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.telephone || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
        <Button onClick={loadData} className="mt-4">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fournisseurs</h1>
          <p className="text-muted-foreground">Gérez vos fournisseurs de pièces</p>
        </div>
        {isVendeurOrAdmin && (
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Fournisseur
          </Button>
        )}
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, contact, email..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Liste */}
      {filteredFournisseurs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucun fournisseur</h3>
            <p className="text-muted-foreground mt-2">
              {searchTerm ? "Aucun résultat pour cette recherche" : "Commencez par ajouter un fournisseur"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFournisseurs.map((fournisseur) => (
            <Card key={fournisseur.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">{fournisseur.nom}</h3>
                  </div>
                  {isVendeurOrAdmin && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(fournisseur)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(fournisseur)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  {fournisseur.contact && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      <span>Contact: {fournisseur.contact}</span>
                    </div>
                  )}
                  {fournisseur.telephone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{fournisseur.telephone}</span>
                    </div>
                  )}
                  {fournisseur.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{fournisseur.email}</span>
                    </div>
                  )}
                  {fournisseur.adresse && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{fournisseur.adresse}</span>
                    </div>
                  )}
                </div>

                {fournisseur._count && (
                  <div className="mt-3 pt-3 border-t">
                    <Badge variant="secondary">
                      {fournisseur._count.pieces} pièce{fournisseur._count.pieces !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Formulaire */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFournisseur ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input placeholder="Nom du fournisseur" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </div>
            <div>
              <Label>Contact</Label>
              <Input placeholder="Nom du contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@exemple.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  placeholder="Numéro de téléphone"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input placeholder="Adresse complète" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Notes ou remarques..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : editingFournisseur ? (
                "Enregistrer"
              ) : (
                "Créer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
