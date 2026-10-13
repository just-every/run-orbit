import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { docsSite } from './src/core/features/public/docs/build/plugin';
export default defineConfig({ plugins: [docsSite(), react(), tailwindcss()] });
