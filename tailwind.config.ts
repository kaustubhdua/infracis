import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17221f",
        forest: "#1e5547",
        mint: "#e8f2eb",
        sand: "#f6f5f0"
      }
    }
  },
  plugins: []
};

export default config;
