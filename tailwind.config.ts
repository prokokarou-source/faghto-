import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#fdfaf7',
        terracotta: '#c1662f',
        ink: '#2a2521',
        sand: '#f0e4da',
      },
    },
  },
  plugins: [],
}

export default config
