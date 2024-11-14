/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './client.html'
  ],
  theme: {
    extend: {
      colors: {
        // Theme 1: Blue and Gray
        'theme1-primary': '#007bff', // Blue
        'theme1-secondary': '#6c757d', // Gray
        'theme1-background': '#f8f9fa', // Light Gray

        // Theme 2: Red and Green
        'theme2-primary': '#dc3545', // Red
        'theme2-secondary': '#28a745', // Green
        'theme2-background': '#f0f0f0', // Lighter Gray
      },
    },
  },
  plugins: [],
  variants: {
    extend: {
      backgroundColor: ['theme1', 'theme2'],
      textColor: ['theme1', 'theme2'],
    },
  },
};