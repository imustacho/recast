import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slate: { 50: "#f5f8f7", 100: "#edf2f0", 200: "#dce5e1", 300: "#b8c9c2", 400: "#7f9690", 500: "#657c75", 600: "#49635b", 700: "#314d44", 800: "#203830", 900: "#18332f", 950: "#0d211c" },
        emerald: { 50: "#ecfaf4", 100: "#def5ec", 200: "#b7e8d9", 300: "#83d3be", 400: "#4cb79d", 500: "#239b82", 600: "#118a75", 700: "#087f6d", 800: "#096452", 900: "#104f42", 950: "#09392f" },
        ink: "#18332f",
        panel: "#f5f8f7",
        accent: "#087f6d",
        accentSoft: "#def5ec",
      },
    },
  },
  plugins: [],
} satisfies Config;
