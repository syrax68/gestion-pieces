import { useEffect, useState } from "react";
import { Bolt, Phone, Mail, MapPin, Clock, Smartphone, RotateCcw } from "lucide-react";
import { publicApi, type BoutiqueInfo } from "../lib/api";

export default function Footer() {
  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);

  useEffect(() => {
    publicApi.getBoutique().then(setBoutique).catch(() => {});
  }, []);

  return (
    <footer className="bg-ink-800 text-slate-300 mt-16 border-t border-line">
      {/* Bande de confiance */}
      <div className="border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent shrink-0" /> Magasin physique — venez voir</div>
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-accent shrink-0" /> Lun–Sam · 8h–18h</div>
          <div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-accent shrink-0" /> Mobile Money accepté</div>
          <div className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-accent shrink-0" /> Retour sous 7 jours</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Identité */}
          <div>
            <div className="flex items-center gap-2 text-slate-100 font-display font-extrabold uppercase tracking-tight text-lg mb-3">
              <span className="h-7 w-7 rounded-lg bg-accent grid place-items-center text-ink-900">
                <Bolt className="h-4 w-4" />
              </span>
              {boutique?.nom || "Pièces Moto"}
            </div>
            <p className="text-sm text-mute leading-relaxed">
              Spécialiste de pièces détachées moto, scooter et quad. Commandez en ligne, nous vous contactons pour confirmer.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-slate-100 font-display font-bold uppercase text-sm tracking-widest mb-3">Contact</h3>
            <ul className="space-y-2 text-sm">
              {boutique?.telephone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-accent shrink-0" />
                  <span>{boutique.telephone}</span>
                </li>
              )}
              {boutique?.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-accent shrink-0" />
                  <span>{boutique.email}</span>
                </li>
              )}
              {(boutique?.adresse || boutique?.ville) && (
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-accent shrink-0" />
                  <span>
                    {boutique.adresse}
                    {boutique.adresse && boutique.ville && ", "}
                    {boutique.ville}
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Commande */}
          <div>
            <h3 className="text-slate-100 font-display font-bold uppercase text-sm tracking-widest mb-3">Comment commander ?</h3>
            <ol className="space-y-2 text-sm text-mute">
              <li className="flex gap-2">
                <span className="text-accent font-bold">1.</span>
                Ajoutez vos pièces au panier
              </li>
              <li className="flex gap-2">
                <span className="text-accent font-bold">2.</span>
                Saisissez votre nom et téléphone
              </li>
              <li className="flex gap-2">
                <span className="text-accent font-bold">3.</span>
                Nous vous rappelons pour confirmer
              </li>
            </ol>
          </div>
        </div>

        <div className="border-t border-line mt-10 pt-6 text-center text-xs text-mute">
          © {new Date().getFullYear()} {boutique?.nom || "Pièces Moto"}. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
