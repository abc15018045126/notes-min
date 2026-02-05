import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
    plugins: [viteSingleFile()],
    build: {
        outDir: '../android/src/main/assets/editor',
        emptyOutDir: true,
    },
    root: './',
});
