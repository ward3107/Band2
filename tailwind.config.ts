import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
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
  plugins: [
    require('@tailwindcss/typography'),
  ],
  // Enable RTL support
  corePlugins: {
    preflight: true,
  },
};
export default config;
