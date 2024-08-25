import esbuild from "esbuild";

await esbuild.build({
  bundle: true,
  entryPoints: ["./src/main.ts"],
  outdir: "./dist",
  outExtension: {
    // 必須では無いが、ESM形式で出力されることを明示的にするため拡張子を.mjsにしている
    ".js": ".mjs",
  },
  platform: "node",
  format: "esm",
  packages: "external",
});
