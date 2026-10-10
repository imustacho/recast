import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        panel: "#f8fafc",
        accent: "#0f766e",
        accentSoft: "#ccfbf1",
      },
    },
  },
  plugins: [],
} satisfies Config;
