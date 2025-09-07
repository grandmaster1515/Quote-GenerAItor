import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/widget.js'),
      name: 'QuoteGeneratorChat',
      fileName: 'quote-generator-chat',
      formats: ['iife'] // Immediately Invoked Function Expression for script tag usage
    },
    rollupOptions: {
      output: {
        // Don't hash the filename for easier embedding
        entryFileNames: 'quote-generator-chat.js',
        assetFileNames: 'quote-generator-chat.[ext]'
      }
    },
    // Ensure all dependencies are bundled
    commonjsOptions: {
      include: [/node_modules/]
    }
  },
  define: {
    // Define global variables for production
    'process.env.NODE_ENV': JSON.stringify('production')
  }
})
