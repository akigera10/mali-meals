import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      colors: {
        "surface-base": "var(--surface-base)",
        "surface-raised": "var(--surface-raised)",
        "surface-sunken": "var(--surface-sunken)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "brand-gold": "var(--brand-gold)",
        "brand-gold-dark": "var(--brand-gold-dark)",
        "brand-gold-soft": "var(--brand-gold-soft)",
        "accent-forest": "var(--accent-forest)",
        "accent-terracotta": "var(--accent-terracotta)",
      },
    },
  },
  plugins: [],
};
export default config;
