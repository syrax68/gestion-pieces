import { useEffect, useState } from "react";
import { Wrench, Phone, Mail, MapPin } from "lucide-react";
import { publicApi, type BoutiqueInfo } from "../lib/api";

export default function Footer() {
  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);

  useEffect(() => {
    publicApi.getBoutique().then(setBoutique).catch(() => {});
  }, []);

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Identité */}
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
              <Wrench className="h-5 w-5 text-brand-400" />
              {boutique?.nom || "Boutique Pièces Moto"}
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Spécialiste de pièces détachées moto, scooter et quad. Commandez en ligne, nous vous contactons pour confirmer.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-3">Contact</h3>
            <ul className="space-y-2 text-sm">
              {boutique?.telephone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-brand-400 shrink-0" />
                  <span>{boutique.telephone}</span>
                </li>
              )}
              {boutique?.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-brand-400 shrink-0" />
                  <span>{boutique.email}</span>
                </li>
              )}
              {(boutique?.adresse || boutique?.ville) && (
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-400 shrink-0" />
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
            <h3 className="text-white font-semibold mb-3">Comment commander ?</h3>
            <ol className="space-y-2 text-sm text-gray-400">
              <li className="flex gap-2">
                <span className="text-brand-400 font-bold">1.</span>
                Ajoutez vos pièces au panier
              </li>
              <li className="flex gap-2">
                <span className="text-brand-400 font-bold">2.</span>
                Saisissez votre nom et téléphone
              </li>
              <li className="flex gap-2">
                <span className="text-brand-400 font-bold">3.</span>
                Nous vous rappelons pour confirmer
              </li>
            </ol>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} {boutique?.nom || "Boutique Pièces Moto"}. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
