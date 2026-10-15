import {
  FaChartLine,
  FaFileContract,
  FaBoltLightning,
  FaCode,
} from "react-icons/fa6";

export const SUGGESTIONS = [
  {
    icon: FaChartLine,
    color: "brand",
    label: "Impact Analysis",
    q: "Analyze environmental impact data for carbon reduction in industrial plants",
  },
  {
    icon: FaFileContract,
    color: "accent",
    label: "Draft Report",
    q: "Draft a preliminary sustainability engineering report for solar adoption",
  },
  {
    icon: FaBoltLightning,
    color: "emerald",
    label: "Energy Efficiency",
    q: "Optimize HVAC energy consumption parameters in commercial buildings",
  },
  {
    icon: FaCode,
    color: "indigo",
    label: "Code Generator",
    q: "Write a Python snippet to calculate greenhouse gas (GHG) equivalencies",
  },
];

export const TXT = {
  brand: "text-brand-400",
  accent: "text-accent-400",
  emerald: "text-emerald-400",
  indigo: "text-indigo-400",
};
export const HOV = {
  brand: "hover:border-brand-500/40",
  accent: "hover:border-accent-500/40",
  emerald: "hover:border-emerald-500/40",
  indigo: "hover:border-indigo-500/40",
};

export const FENCE = "`".repeat(3);

// Nomor dokumen reporting system
export const DOC_PATTERN = "IKENG-ABQR\\d+\\/\\d+";
export const DOC_BASE = "http://172.16.104.97/reporting-system/viewReport/";
export const docUrl = (n) => DOC_BASE + n.replace(/\//g, "");

/* ---------- Konfigurasi gambar ---------- */
export const MAX_IMG = 4; // maksimal gambar per pesan (samakan dengan MAX_IMAGES di server)
export const MAX_CTX_IMG = 4; // total gambar per request (samakan dengan MAX_CTX_IMAGES di server)
export const IMG_FOLLOWUP_MAX = 4; // jendela pertanyaan lanjutan yang masih membawa gambar
export const IMG_MAX_SIDE = 1280;
export const IMG_QUALITY = 0.85;
export const THUMB_SIDE = 160; // thumbnail untuk tampilan + localStorage
export const THUMB_QUALITY = 0.6;

/* ---------- File teks ---------- */
export const TEXT_FILE_ACCEPT =
  ".txt,.md,.csv,.tsv,.json,.log,.sql,.js,.ts,.py,.html,.css,.xml,.yml,.yaml,.cs,.aspx,.ini";
export const TEXT_FILE_MAX_BYTES = 300000;
export const TEXT_FILE_MAX_CHARS = 20000;
