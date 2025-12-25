module.exports = {
  content: [
    "./*.html",
    "./src/**/*.{html,js}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0D9488", // Professional Teal
          light: "#F0FDFA",
          dark: "#0F766E",
        },
        slate: {
          DEFAULT: "#334155",
          dark: "#0F172A",
          light: "#F8FAFC",
        }
      },
      boxShadow: {
        premium: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        soft: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      }
    },
  },
  plugins: [],
};
