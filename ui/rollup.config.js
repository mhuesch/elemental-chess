import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import builtins from "rollup-plugin-node-builtins";
import globals from "rollup-plugin-node-globals";

import babel from "@rollup/plugin-babel";
import html from "@web/rollup-plugin-html";
import { importMetaAssets } from "@web/rollup-plugin-import-meta-assets";
import { terser } from "rollup-plugin-terser";
import { generateSW } from "rollup-plugin-workbox";
import path from "path";

const outputDir =
  process.env.ENV === "holodev" || process.env.ENV === "hcdev"
    ? `.dist/${process.env.HC_PORT}`
    : "dist";

export default {
  input: "index.html",
  output: {
    entryFileNames: "[hash].js",
    chunkFileNames: "[hash].js",
    assetFileNames: "[hash][extname]",
    format: "es",
    dir: outputDir,
  },
  preserveEntrySignatures: false,

  plugins: [
    /** Enable using HTML as rollup entrypoint */
    html({
      minify: true,
      injectServiceWorker: true,
      serviceWorkerPath: "dist/sw.js",
    }),
    /** Resolve bare module imports */
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    replace({
      "process.env.NODE_ENV": '"production"',
      "process.env.ENV": `"${process.env.ENV}"`,
      "process.env.HC_PORT": `"${process.env.HC_PORT}"`,
    }),
    builtins(),
    typescript({ experimentalDecorators: true, outDir: outputDir }),
    commonjs({}),
    globals(),
    /** Minify JS */
    terser(),
    /** Bundle assets references via import.meta.url */
    importMetaAssets(),
    /** Compile JS to a lower language target */
    babel({
      babelHelpers: "bundled",
      exclude: /node_modules/,
      presets: [
        [
          require.resolve("@babel/preset-env"),
          {
            targets: [
              "last 3 Chrome major versions",
              "last 3 Firefox major versions",
              "last 3 Edge major versions",
              "last 3 Safari major versions",
            ],
            modules: false,
            bugfixes: true,
          },
        ],
      ],
      plugins: [
        [
          require.resolve("babel-plugin-template-html-minifier"),
          {
            modules: { lit: ["html", { name: "css", encapsulation: "style" }] },
            failOnError: false,
            strictCSS: true,
            htmlMinifier: {
              collapseWhitespace: true,
              conservativeCollapse: true,
              removeComments: true,
              caseSensitive: true,
              minifyCSS: true,
            },
          },
        ],
      ],
    }),
    /** Create and inject a service worker */
    generateSW({
      globIgnores: ["polyfills/*.js", "nomodule-*.js"],
      navigateFallback: "/index.html",
      // where to output the generated sw
      swDest: path.join("dist", "sw.js"),
      // directory to match patterns against to be precached
      globDirectory: path.join("dist"),
      // cache any html js and css by default
      globPatterns: ["**/*.{html,js,css,webmanifest}"],
      skipWaiting: true,
      clientsClaim: true,
      runtimeCaching: [{ urlPattern: "polyfills/*.js", handler: "CacheFirst" }],
    }),
  ],
};
