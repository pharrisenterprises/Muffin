import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
    publicDir: false, // 👈 Prevent copying public/ folder
    build: {
        outDir: "dist/background", // Keep background separate
        emptyOutDir: false, // Don't wipe out other builds
        lib: {
            entry: path.resolve(__dirname, "src/background/background.ts"),
            formats: ["iife"],
            fileName: () => "background.js",
            name: "TestFlowBackground"
        },
        rollupOptions: {
            input: path.resolve(__dirname, "src/background/background.ts"),
            output: {
                format: "iife",
                entryFileNames: "[name].js",
            },
        },
    },
});
