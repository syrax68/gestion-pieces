import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Building2,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Client, Facture, clientsApi, facturesApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function Clients() {
  const { isAdmin, user } = useAuth();
  const isVendeurOrAdmin = user?.role === "ADMIN" || user?.role === "VENDEUR";

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [clientFactures, setClientFactures] = useState<Facture[]>([]);
  const [loadingFactures, setLoadingFactures] = useState(false);

  // Formulaire
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    entreprise: "",
    email: "",
    telephone: "",
    telephoneMobile: "",
    adresse: "",
    ville: "",
    codePostal: "",
    siret: "",
    notes: "",
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clientsApi.getAll();
      setClients(data);
    } catch (err) {
      setError("Erreur lors du chargement des clients");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      nom: "",
      prenom: "",
      entreprise: "",
      email: "",
      telephone: "",
      telephoneMobile: "",
      adresse: "",
      ville: "",
      codePostal: "",
      siret: "",
      notes: "",
    });
    setEditingClient(null);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (client: Client) => {
    setEditingClient(client);
    setForm({
      nom: client.nom || "",
      prenom: client.prenom || "",
      entreprise: client.entreprise || "",
      email: client.email || "",
      telephone: client.telephone || "",
      telephoneMobile: client.telephoneMobile || "",
      adresse: client.adresse || "",
      ville: client.ville || "",
      codePostal: client.codePostal || "",
      siret: client.siret || "",
      notes: client.notes || "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nom.trim()) return;
    try {
      setSaving(true);
      if (editingClient) {
        await clientsApi.update(editingClient.id, form);
      } else {
        await clientsApi.create(form);
      }
      setIsFormOpen(false);
      resetForm();
      await loadClients();
    } catch (err) {
      console.error(err);
      setError(editingClient ? "Erreur lors de la modification" : "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce client ?")) return;
    try {
      await clientsApi.delete(id);
      await loadClients();
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la suppression");
    }
  };

  const toggleExpand = async (clientId: string) => {
    if (expandedClient === clientId) {
      setExpandedClient(null);
      return;
    }
    setExpandedClient(clientId);
    try {
      setLoadingFactures(true);
      const data = await facturesApi.getAll({ clientId });
      setClientFactures(data);
    } catch {
      setClientFactures([]);
    } finally {
      setLoadingFactures(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.nom?.toLowerCase().includes(term) ||
      c.prenom?.toLowerCase().includes(term) ||
      c.entreprise?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.telephone?.toLowerCase().includes(term)
    );
  });

  const formatStatut = (statut: string) => {
    switch (statut) {
      case "PAYEE":
        return "Payée";
      case "EN_ATTENTE":
        return "En attente";
      case "ANNULEE":
        return "Annulée";
      case "BROUILLON":
        return "Brouillon";
      case "PARTIELLEMENT_PAYEE":
        return "Partielle";
      default:
        return statut;
    }
  };

  const getStatutVariant = (statut: string): "default" | "secondary" | "destructive" => {
    switch (statut) {
      case "PAYEE":
        return "default";
      case "ANNULEE":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Clients
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clients.length} client{clients.length > 1 ? "s" : ""} enregistré{clients.length > 1 ? "s" : ""}
          </p>
        </div>
        {isVendeurOrAdmin && (
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau client
          </Button>
        )}
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">{error}</div>}

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un client (nom, prénom, entreprise, email, téléphone)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Liste des clients */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchTerm ? "Aucun client ne correspond à la recherche." : "Aucun client enregistré."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  {/* Infos principales */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">
                        {client.nom} {client.prenom || ""}
                      </h3>
                      {client.entreprise && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {client.entreprise}
                        </Badge>
                      )}
                      {client._count?.factures !== undefined && client._count.factures > 0 && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {client._count.factures} facture{client._count.factures > 1 ? "s" : ""}
                        </Badge>
                      )}
                      {client.code && <span className="text-xs text-muted-foreground font-mono">{client.code}</span>}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                      {client.telephone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {client.telephone}
                        </span>
                      )}
                      {client.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {client.email}
                        </span>
                      )}
                      {(client.ville || client.adresse) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[client.adresse, client.codePostal, client.ville].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-start gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(client.id)} title="Voir les factures">
                      {expandedClient === client.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    {isVendeurOrAdmin && (
                      <Button variant="ghost" size="sm" onClick={() => openEditForm(client)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(client.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Factures du client (expandable) */}
                {expandedClient === client.id && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Dernières factures
                    </h4>
                    {loadingFactures ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      </div>
                    ) : clientFactures.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">Aucune facture pour ce client.</p>
                    ) : (
                      <div className="space-y-2">
                        {clientFactures.slice(0, 5).map((f) => (
                          <div
                            key={f.id}
                            className="flex flex-col xs:flex-row xs:items-center justify-between text-sm bg-slate-50 dark:bg-slate-800 rounded px-3 py-2 gap-1"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-medium">{f.numero}</span>
                              <span className="text-muted-foreground">{new Date(f.dateFacture).toLocaleDateString("fr-FR")}</span>
                              <Badge variant={getStatutVariant(f.statut)}>{formatStatut(f.statut)}</Badge>
                            </div>
                            <span className="font-semibold whitespace-nowrap">{typeof f.total === "number" ? f.total.toFixed(2) : f.total} Fmg</span>
                          </div>
                        ))}
                        {clientFactures.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center">
                            ... et {clientFactures.length - 5} autre{clientFactures.length - 5 > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog création / édition */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Modifier le client" : "Nouveau client"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nom">Nom *</Label>
                <Input id="nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom" />
              </div>
              <div>
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                  placeholder="Prénom"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="entreprise">Entreprise</Label>
              <Input
                id="entreprise"
                value={form.entreprise}
                onChange={(e) => setForm({ ...form, entreprise: e.target.value })}
                placeholder="Nom de l'entreprise"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@exemple.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="01 23 45 67 89"
                />
              </div>
              <div>
                <Label htmlFor="telephoneMobile">Mobile</Label>
                <Input
                  id="telephoneMobile"
                  value={form.telephoneMobile}
                  onChange={(e) => setForm({ ...form, telephoneMobile: e.target.value })}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                placeholder="Rue, numéro..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codePostal">Code postal</Label>
                <Input
                  id="codePostal"
                  value={form.codePostal}
                  onChange={(e) => setForm({ ...form, codePostal: e.target.value })}
                  placeholder="75000"
                />
              </div>
              <div>
                <Label htmlFor="ville">Ville</Label>
                <Input id="ville" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} placeholder="Paris" />
              </div>
            </div>

            <div>
              <Label htmlFor="siret">SIRET</Label>
              <Input
                id="siret"
                value={form.siret}
                onChange={(e) => setForm({ ...form, siret: e.target.value })}
                placeholder="123 456 789 00012"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes internes sur ce client..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={!form.nom.trim() || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingClient ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
