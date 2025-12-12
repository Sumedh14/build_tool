import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import chokidar from "chokidar";
import { createRequire } from 'node:module';
import esbuild, { transformSync } from "esbuild";

import { createHMRServer } from './hmr.js';
import { applyPlugins } from '../utils/applyPlugins.js';
import { loadConfig } from '../utils/loadConfig.js';
import { resolveBareImport } from '../utils/resolveBarerImports.js';
import { convertCjsToEsm } from '../utils/cjsToEsm.js';
const require = createRequire(import.meta.url);


const NODE_ONLY_MODULES = ["cookie", "set-cookie-parser", "fs", "path", "http"];



function findIndexHtml(projectRoot) {
    const viteIndex = path.join(projectRoot, "index.html");
    if (fs.existsSync(viteIndex)) {
        return viteIndex;
    }

    const craIndex = path.join(projectRoot, "public", "index.html");
    if (fs.existsSync(craIndex)) {
        return craIndex;
    }

    const possible = [
        path.join(projectRoot, "index.html"),
        path.join(projectRoot, "public", "index.html"),
        path.join(projectRoot, "static", "index.html"),
        path.join(projectRoot, "app", "index.html"),
    ];

    for (const p of possible) {
        if (fs.existsSync(p)) return p;
    }

    const found = scanForIndexHtml(projectRoot);
    if (found.length > 0) {
        return found[0];
    }

    throw new Error("index.html not found in project.");
}



function scanForIndexHtml(projectRoot) {
    const results = [];

    function walk(dir) {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const f of files) {
            const full = path.join(dir, f.name);
            if (f.isDirectory()) {
                if (f.name === "node_modules") continue;
                walk(full);
            } else if (f.name === "index.html") {
                results.push(full);
            }
        }
    }

    walk(projectRoot);
    return results;
}



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
        const index = findIndexHtml(project);
        let html = fs.readFileSync(index, "utf-8");
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

    app.use('/@modules', async (req, res) => {
        try {
            const specifier = req.path.replace("/@modules/", "").replace(/^\/+/, "");

            // if (NODE_ONLY_MODULES.includes(specifier)) {
            //     console.warn(`[SHIM] Node-only module "${specifier}" loaded in browser. Returning empty module.`);
            //     return res.type("application/javascript").send(`export default {};`);
            // }

            if (specifier === "react/jsx-runtime") {
                const bundled = await reactJsxRuntime(path.join(project, "node_modules", "react"));
                return res.type("application/javascript").send(`
                      ${bundled}
                     import * as m from "/@modules/react/jsx-runtime-cjs-wrapper";

                     export const jsx = m.jsx;
                     export const jsxs = m.jsxs;
                     export const Fragment = m.Fragment;
                     export const jsxDEV = m.jsxDEV;
                `);
            }

            if (specifier === "react/jsx-dev-runtime") {

                const result = await reactJsxDevRuntime(path.join(project, "node_modules", "react"));
                return res.type("application/javascript").send(result);
            }

            if (specifier === "react/jsx-runtime-cjs-wrapper") {
                const bundled = await reactJsxRuntimeCjsWrapper(path.join(project, "node_modules", "react"));
                return res.type("application/javascript").send(bundled);
            }

            if (specifier === "react/jsx-runtime-cjs") {
                const result = await reactJsxRuntimeCjs(path.join(project, "node_modules", "react"));
                return res.type("application/javascript").send(result.outputFiles[0].text);
            }

            const resolved = await resolveBareImport(specifier, project);
            console.log("Resolved: ========================================= \n", resolved)
            if (resolved.endsWith(path.join("zustand", "index.js"))) {
                console.log(
                    "Resolved Zustand:",
                    fs.readFileSync(resolved, "utf-8")
                );
            }
            let code = fs.readFileSync(resolved, "utf8");
            code = code
                .replace(/process\.env\.NODE_ENV/g, '"development"')
            console.log("code'development'=============\n", code);
            code = code.replace(/\bprocess\b/g, "{}");
            console.log("code'\bprocess\b'=============\n", code);

            const result = await esbuild.build({
                stdin: {
                    contents: code,
                    resolveDir: path.dirname(resolved),
                    sourcefile: resolved,
                    loader: "js",
                },
                bundle: true,
                format: "esm",
                target: "esnext",
                write: false,
            });

            let bundledCode = result.outputFiles[0].text;

            res.type("application/javascript").send(bundledCode);
        } catch (err) {
            console.error("Module Resolution Failed:", err.message);
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

                code = convertCjsToEsm(code, file);

                console.log("code ========================================= \n", code);
                code = await applyPlugins(plugins, "transform", code, file);
            }

            code = rewriteImports(code);
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


async function reactJsxRuntime(project) {
    const file = path.join(project, "cjs", "react-jsx-runtime.development.js");

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
    return bundled;
}

async function reactJsxDevRuntime(project) {

    const file = path.join(project, "cjs", "react-jsx-dev-runtime.development.js");

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

    return result.outputFiles[0].text;
}

async function reactJsxRuntimeCjsWrapper(project) {
    const file = path.join(project, "cjs", "react-jsx-runtime.development.js");

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

    return bundled;
}

async function reactJsxRuntimeCjs(project) {
    const cjsFile = path.join(project, "cjs", "react-jsx-runtime.development.js");
    let code = fs.readFileSync(cjsFile, "utf8");

    code = code
        .replace(/process\.env\.NODE_ENV/g, '"development"')
        .replace(/process\.env\.BROWSER/g, 'true')
        .replace(/\bprocess\b/g, '{}');

    const result = await esbuild.build({
        stdin: {
            contents: code,
            resolveDir: project,
            sourcefile: cjsFile,
            loader: "js"
        },
        bundle: true,
        format: "esm",
        target: "esnext",
        write: false,
    });

    return result.outputFiles[0].text
}