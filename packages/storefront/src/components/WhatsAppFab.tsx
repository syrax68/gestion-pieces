import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { publicApi, type BoutiqueInfo } from "../lib/api";

/**
 * Bouton WhatsApp flottant, présent sur toutes les pages.
 * Construit un lien wa.me à partir du téléphone de la boutique.
 */
export default function WhatsAppFab() {
  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);

  useEffect(() => {
    publicApi.getBoutique().then(setBoutique).catch(() => {});
  }, []);

  if (!boutique?.telephone) return null;

  // Normalise le numéro pour wa.me (chiffres uniquement)
  const numero = boutique.telephone.replace(/[^0-9]/g, "");
  const message = encodeURIComponent("Bonjour, je vous contacte au sujet de pièces moto.");
  const href = `https://wa.me/${numero}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nous contacter sur WhatsApp"
      className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full grid place-items-center shadow-xl shadow-black/40 transition-transform hover:scale-105"
      style={{ background: "#25D366" }}
    >
      <MessageCircle className="h-7 w-7 text-white" />
    </a>
  );
}
