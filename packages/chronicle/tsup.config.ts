import { defineConfig } from "tsup";

export default defineConfig([
    {
        entry: ["src/bin/**.ts"],
        format: ["cjs", "esm"],
        outDir: "dist/bin",
        dts: true,
    },
    {
        entry: ["src/types/**.ts"],
        format: ["cjs", "esm"],
        outDir: "dist/types",
        dts: true,
    },
    {
        entry: ["src/lib/**.ts"],
        format: ["cjs", "esm"],
        outDir: "dist/lib",
        dts: true,
    },
    {
        entry: ["src/node/**.ts"],
        format: ["cjs", "esm"],
        outDir: "dist/node",
        dts: true,
    },
]);
