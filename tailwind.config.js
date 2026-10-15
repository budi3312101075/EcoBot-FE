/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#ecfdf5", 100: "#d1fae5", 400: "#34d399", 500: "#10b981", 600: "#059669", 900: "#064e3b" },
        accent: { 400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7" },
        dark: { bg: "#07090e", surface: "#0d111a", card: "#131926", border: "rgba(255,255,255,0.08)" },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-glow": "pulseGlow 3s infinite ease-in-out",
        float: "float 6s ease-in-out infinite",
        "fade-in": "fadeIn 0.25s cubic-bezier(0.16,1,0.3,1)",
      },
      keyframes: {
        pulseGlow: {
          "0%,100%": { opacity: "0.4", filter: "blur(20px)" },
          "50%": { opacity: "0.8", filter: "blur(30px)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.99)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
