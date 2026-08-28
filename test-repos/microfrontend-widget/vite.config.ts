import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Microfrontend Library Bundle Mode
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/Widget.tsx'),
      name: 'AnalyticsWidget',
      fileName: (format) => `widget.${format}.js`
    },
    rollupOptions: {
      // Exclude peer dependencies from bundle to keep it lightweight
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
});
