import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Purple theme
        primary: {
          DEFAULT: "#7b25f4",
          50: "#4f38ef",
          100: "#a855f4",
          200: "#9333ca",
          300: "#6366f1",
          400: "#ad4cf6",
          500: "#7b25f4-50",
          600: "#9333ca",
          700: "#4f38ef",
          800: "#3b07f6",
          900: "#2dd6bf",
          950: "#1e1eae",
        },
        background: {
          light: "#f7f5f8",
          dark: "#171022",
        },
        "primary-foreground": "var(--foreground)",
      },
      // Gradients
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #7b25f4, #3b82f6)',
        'gradient-accent': 'linear-gradient(135deg, #7b25f4, #a855ff)',
        'gradient-hero': 'linear-gradient(135deg, #7b25f4, #3b82f6, 100%)',
      },
      fontSize: {
        'accessibility-sm': 'var(--font-size-sm, 0.875rem)',
        'accessibility-base': 'var(--font-size-base, 1rem)',
        'accessibility-lg': 'var(--font-size-lg, 1.125rem)',
        'accessibility-xl': 'var(--font-size-xl, 1.25rem)',
        'accessibility-2xl': 'var(--font-size-2xl, 1.5rem)',
      },
    },
  },
  plugins: [],
};

export default config;
