import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createHMRServer } from './hmr.js';
import { applyPlugins } from '../utils/applyPlugins.js';
import { loadConfig } from '../utils/loadConfig.js';
import { createRequire } from 'node:module';
import chokidar from "chokidar";
const require = createRequire(import.meta.url);

import esbuild, { transformSync } from "esbuild";


export async function devServer(artifactPath) {
    const project = path.resolve(artifactPath);

    const app = express();
    const config = await loadConfig();
    const plugins = config.plugins || [];


    const { sendHMRUpdate, wss } = createHMRServer();

    const publicDir = path.resolve(path.join(project, "public"));
    if (fs.existsSync(publicDir)) {
        app.use(express.static(publicDir));
    }

    const watcher = chokidar.watch(project, {
        ignored: [
            path.join(project, "node_modules"),
            path.join(project, "dist")
        ],
        ignoreInitial: true,
    });

    watcher.on("all", (event, filePath) => {
        const relative = '/' + path.relative(project, filePath).replace(/\\/g, "/");
        const ext = path.extname(relative);

        console.log(`[WATCHER] ${event}: ${relative}`);

        const isCode = [".js", ".jsx", ".ts", ".tsx"].includes(ext);

        if (isCode) {
            sendHMRUpdate(relative);
        } else {
            sendHMRUpdate({ type: "reload" });
        }
    });

    app.get('/', (_, res) => {
        let index = path.join(project, 'index.html')
        let html = fs.readFileSync(index, 'utf-8');
        html = html.replace('</body>',
            `<script type="module" src="/@rbuild/react-refresh"></script>
            <script type="module" src="/src/main.jsx"></script>
             <script type="module" src="/@rbuild/hmr"></script>
             </body>`);
        res.send(html);
    });

    app.get('/@rbuild/react-refresh', (req, res) => {
        res.type('js').send(`
            window.$RefreshReg$ = () => {};
            window.$RefreshSig$ = () => (type) => type;
        `);
    });


    app.get('/@rbuild/hmr', (_, res) => {
        console.log("📡 HMR client loaded");
        res.type('js').send(`
            window.ws = new WebSocket('ws://localhost:5001');
            window.ws.onmessage = (e) => {
                 console.log("📥 WS MESSAGE RECEIVED:", e.data);
                const data = JSON.parse(e.data);
                if(data.type === 'reload') location.reload();
                if(data.type === 'update'){
                console.log("🔄 HMR importing:", data.path);
                import(data.path + '?t=' + Date.now());
                location.reload()
                };
            }; 
        `);
    });


    // Serve node_modules bare imports
    app.use('/@modules', async (req, res) => {
        try {
            const id = req.path.replace("/@modules/", "").replace(/^\/+/, "");;

            const parts = id.split("/");
            let pkgName, subpath;

            if (id.startsWith("@")) {
                pkgName = parts.slice(0, 2).join("/");
                subpath = parts.slice(2).join("/");
            } else {
                pkgName = parts[0];
                subpath = parts.slice(1).join("/");
            }

            const pkgRoot = path.join(project, "node_modules", pkgName);
            const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgRoot, "package.json"), "utf8"));


            let filePath;

            if (id === "react/jsx-runtime") {
                const file = path.join(pkgRoot, "cjs", "react-jsx-runtime.development.js");

                let code = fs.readFileSync(file, "utf8");

                code = code
                    .replace(/process\.env\.NODE_ENV/g, '"development"')
                    .replace(/\bprocess\b/g, "{}");

                const result = await esbuild.build({
                    stdin: {
                        contents: code,
                        resolveDir: path.dirname(file),
                        sourcefile: file,
                        loader: "js",
                    },
                    bundle: true,
                    format: "esm",
                    target: "esnext",
                    write: false,
                });


                const bundled = result.outputFiles[0].text;

                return res.type("application/javascript").send(`
                     ${bundled}
                    import * as m from "/@modules/react/jsx-runtime-cjs-wrapper";

                    export const jsx = m.jsx;
                    export const jsxs = m.jsxs;
                    export const Fragment = m.Fragment;
                    export const jsxDEV = m.jsxDEV;
                `);
            }


            if (id === "react/jsx-dev-runtime") {
                const file = path.join(pkgRoot, "cjs", "react-jsx-dev-runtime.development.js");

                let code = fs.readFileSync(file, "utf8");

                code = code
                    .replace(/process\.env\.NODE_ENV/g, '"development"')
                    .replace(/\bprocess\b/g, "{}");

                const result = await esbuild.build({
                    stdin: {
                        contents: code,
                        resolveDir: path.dirname(file),
                        sourcefile: file,
                        loader: "js",
                    },
                    bundle: true,
                    format: "esm",
                    target: "esnext",
                    write: false,
                });

                return res.type("application/javascript").send(result.outputFiles[0].text);
            }

            if (id === "react/jsx-runtime-cjs-wrapper") {
                const file = path.join(pkgRoot, "cjs", "react-jsx-runtime.development.js");

                let code = fs.readFileSync(file, "utf8");
                code = code
                    .replace(/process\.env\.NODE_ENV/g, '"development"')
                    .replace(/\bprocess\b/g, "{}");

                const result = await esbuild.build({
                    stdin: {
                        contents: code,
                        resolveDir: path.dirname(file),
                        sourcefile: file,
                        loader: "js",
                    },
                    bundle: true,
                    format: "esm",
                    target: "esnext",
                    write: false,
                });

                let bundled = result.outputFiles[0].text;

                bundled += `
                 const _m = require_react_jsx_runtime_development();
                    export const jsx = _m.jsx;
                    export const jsxs = _m.jsxs;
                    export const jsxDEV = _m.jsxDEV;
                    export const Fragment = _m.Fragment;
                `;

                return res.type("application/javascript").send(bundled);
            }

            if (id === "react/jsx-runtime-cjs") {
                const cjsFile = path.join(pkgRoot, "cjs", "react-jsx-runtime.development.js");
                let code = fs.readFileSync(cjsFile, "utf8");

                code = code
                    .replace(/process\.env\.NODE_ENV/g, '"development"')
                    .replace(/process\.env\.BROWSER/g, 'true')
                    .replace(/\bprocess\b/g, '{}');

                const result = await esbuild.build({
                    stdin: {
                        contents: code,
                        resolveDir: pkgRoot,
                        sourcefile: cjsFile,
                        loader: "js"
                    },
                    bundle: true,
                    format: "esm",
                    target: "esnext",
                    write: false,
                });

                return res.type("application/javascript").send(result.outputFiles[0].text);
            }

            if (pkgJson.exports) {

                let exportKey;

                if (!subpath) {
                    exportKey = ".";
                } else {
                    exportKey = "./" + subpath;
                }

                // const key = "./" + subpath;
                if (pkgJson.exports[exportKey]) {

                    const exp = pkgJson.exports[exportKey];
                    if (typeof exp === "string") {
                        filePath = path.join(pkgRoot, exp);
                    } else if (exp.import) {
                        filePath = path.join(pkgRoot, exp.import);
                    } else if (exp.module) {
                        filePath = path.join(pkgRoot, exp.module);
                    }
                    else {
                        filePath = path.join(pkgRoot, exp.default || exp.browser);
                    }
                }
            }
            // Fallback (module → main)
            if (!filePath) {
                filePath = path.join(pkgRoot, subpath || pkgJson.module || pkgJson.main || "index.js");
            }

            let code = fs.readFileSync(filePath, "utf8");

            if (pkgName === "react" || pkgName === "react-dom") {
                code = code
                    .replace(/process\.env\.NODE_ENV/g, '"development"')
                    .replace(/process\.env\.BROWSER/g, 'true')
                    .replace(/\bprocess\b/g, '{}');
            }
            const result = await esbuild.build({
                stdin: {
                    contents: code,
                    resolveDir: pkgRoot,
                    sourcefile: filePath,
                    loader: "js"
                },
                bundle: true,
                format: "esm",
                target: "esnext",
                write: false,
            });

            res.type("application/javascript").send(result.outputFiles[0].text);
        } catch (err) {
            console.error(`Failed to resolve module ${req.path}:`, err.message);
            res.status(404).send(`Module not found: ${req.path}`);
        }
    });

    app.use(async (req, res, next) => {
        const ext = path.extname(req.path);
        if (!['.js', '.jsx', '.ts', '.tsx', '.css'].includes(ext)) return next();

        const file = path.join(project, req.path.slice(1));

        if (!fs.existsSync(file)) {
            if (ext === '.css' || ext === '.module.css') {
                console.warn(`Warning: CSS file not found: ${file}. Returning empty module.`);
                return res.type('application/javascript').send(`export default {};`);
            } else {
                console.error(`File not found: ${file}`);
                return res.status(404).send("File not found");
            }
        }

        let code = fs.readFileSync(file, "utf-8");
        const isNodeModule = file.includes("node_modules");
        try {

            if (!isNodeModule) {
                code = await applyPlugins(plugins, "transform", code, file);
                code = rewriteImports(code);
            }

            const result = transformSync(code, {
                loader: ext.includes("x") ? "jsx" : "js",
                target: "esnext",
                format: "esm",
                sourcemap: "inline",
            });

            code = result.code;

        } catch (err) {
            console.error(`Plugin transform error for ${req.path}:`, err);
        }

        // if (
        //     !isNodeModule &&
        //     !req.path.startsWith("/@modules/")
        // ) {
        //     sendHMRUpdate(req.path);
        // }

        res.type('application/javascript').send(code);
    });

    app.listen(3001, () =>
        console.log("Dev server running at http://localhost:3001")
    );
}
function rewriteImports(code) {
    return code.replace(/from ['"]([^'".][^'"]*)['"]/g, (match, p1) => {
        if (!p1.startsWith('.') && !p1.startsWith('/')) {
            return `from '/@modules/${p1}'`;
        }
        return match;
    });
}
