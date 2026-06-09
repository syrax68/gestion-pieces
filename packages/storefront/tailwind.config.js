/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Archivo", "system-ui", "sans-serif"],
      },
      colors: {
        // Surfaces sombres (atelier / racing)
        ink: {
          900: "#0B0F14",
          800: "#121922",
          700: "#1A2430",
          600: "#243140",
          500: "#33445A",
        },
        line: "#2A3743",
        mute: "#93A2B1",
        // Accent orange — remplace l'ancien bleu. `brand` est conservé et
        // remappé pour que les classes existantes restent cohérentes.
        accent: {
          DEFAULT: "#FF6B1A",
          400: "#FF8A4D",
          500: "#FF6B1A",
          600: "#F25C09",
          soft: "#3A2415",
        },
        brand: {
          50: "#FFF4EC",
          100: "#FFE3D1",
          200: "#FFC6A3",
          300: "#FFA875",
          400: "#FF8A4D",
          500: "#FF6B1A",
          600: "#F25C09",
          700: "#C7490A",
          800: "#9A390B",
          900: "#7A2E0B",
        },
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        shimmer: "shimmer 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
