import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(root, 'dist');

const alias = {
  '@': path.resolve(root, 'src'),
  '@shared': path.resolve(root, 'src/shared'),
};

/** @param {'popup'|'content'|'upload-hook'|'background'} target */
export function createViteConfig(target) {
  const base = { resolve: { alias } };

  if (target === 'panel') {
    return defineConfig({
      ...base,
      root,
      plugins: [vue()],
      base: './',
      build: {
        outDir: path.join(distDir, 'panel'),
        emptyOutDir: true,
        sourcemap: false,
        rollupOptions: {
          input: path.resolve(root, 'src/main.js'),
          output: {
            format: 'es',
            entryFileNames: 'app.js',
            inlineDynamicImports: true,
            assetFileNames: 'assets/[name][extname]',
          },
        },
      },
    });
  }

  if (target === 'popup') {
    return defineConfig({
      ...base,
      root,
      plugins: [vue()],
      base: './',
      build: {
        outDir: path.join(distDir, 'popup'),
        emptyOutDir: true,
        sourcemap: false,
        rollupOptions: {
          input: path.resolve(root, 'src/main.js'),
          output: {
            format: 'es',
            entryFileNames: 'app.js',
            inlineDynamicImports: true,
            assetFileNames: 'assets/[name][extname]',
          },
        },
      },
    });
  }

  if (target === 'content') {
    return defineConfig({
      ...base,
      root,
      build: {
        outDir: path.join(distDir, 'content'),
        emptyOutDir: true,
        sourcemap: false,
        rollupOptions: {
          input: path.resolve(root, 'src/content/main.js'),
          output: {
            format: 'iife',
            entryFileNames: 'content.js',
            extend: true,
          },
        },
      },
    });
  }

  if (target === 'upload-hook') {
    return defineConfig({
      ...base,
      root,
      build: {
        outDir: path.join(distDir, 'content'),
        emptyOutDir: false,
        sourcemap: false,
        rollupOptions: {
          input: path.resolve(root, 'src/content/upload-hook.js'),
          output: {
            format: 'iife',
            entryFileNames: 'upload-hook.js',
            extend: true,
          },
        },
      },
    });
  }

  return defineConfig({
    ...base,
    root,
    build: {
      outDir: path.join(distDir, 'background'),
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        input: path.resolve(root, 'src/background/index.js'),
        output: {
          format: 'es',
          entryFileNames: 'background.js',
          inlineDynamicImports: true,
          paths: (id) =>
            id.includes('shared/config') ? '../shared/config.js' : id,
        },
        external: (id) => id.includes('shared/config'),
      },
    },
  });
}

/** Dev server — panel Vue preview. */
const target = process.env.VEO_BUILD_TARGET;

export default target
  ? createViteConfig(target)
  : defineConfig({
      plugins: [vue()],
      root,
      base: './',
      resolve: { alias },
      server: { port: 5173, open: '/' },
    });
