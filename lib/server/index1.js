import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createHMRServer } from './hmr.js';
import { applyPlugins } from '../utils/applyPlugins.js';
import { loadConfig } from '../utils/loadConfig.js';


export async function devServer(artifactPath) {
    const project = path.resolve(artifactPath);

    const app = express();
    const config = await loadConfig();
    const plugins = config.plugins || [];

    const { sendHMRUpdate, wss } = createHMRServer();

    const publicDir = path.resolve(project, 'public');

    if (fs.existsSync(publicDir)) {
        app.use(express.static(publicDir));
    }

    app.get('/@rbuild/env', (req, res) => {
        res.type('js').send(`
            window.process = { env: { NODE_ENV: 'development' } };
            window.global = window;
        `);
    });

    app.get('/@rbuild/react-refresh', (req, res) => {
        res.type('js').send(`
            window.$RefreshReg$ = () => {};
            window.$RefreshSig$ = () => (type) => type;
        `);
    });

    app.get('/', (req, res) => {
        let html = fs.readFileSync('index.html', 'utf-8');
        html = html.replace('</body>',
            `<script type="module" src="/@rbuild/env"></script>
            <script type="module" src="/@rbuild/react-refresh"></script>
            <script type="module" src="/src/main.jsx"></script>
            <script type="module" src="/@rbuild/hmr"></script>
        </body>`);
        res.send(html);
    });

    app.get('/@rbuild/hmr', (req, res) => {
        res.type('js').send(`
            const ws = new WebSocket('ws://localhost:5001');
            ws.onmessage = (e) => {
                const data = JSON.parse(e.data);
                if(data.type === 'reload') location.reload();
                if(data.type === 'update'){
                import(data.path + '?t=' + Date.now())};
            }; 
        `);
    });

    app.use('/@modules', async (req, res) => {

        console.log("start", req.path)
        const moduleName = req.path.replace(/^\//, ""); // e.g. "react/jsx-runtime"
        console.log("moduleName", req.path)
        let modulePath;
        try {
            // Resolve the full path using Node resolution
            modulePath = require.resolve(moduleName, { paths: [process.cwd()] });
            console.log("modulePath", modulePath)
        } catch (e) {
            console.error('[Module Not Found]', moduleName);
            return res.status(404).end();
        }

        if (moduleName.startsWith('react')) {
            let esmPath;
            try {
                esmPath = require.resolve(moduleName, { paths: [process.cwd()] });
            } catch (err) {
                console.error('[Module Not Found]', moduleName, err);
                return res.status(404).end();
            }

            let code = fs.readFileSync(esmPath, 'utf-8');
            code = rewriteImports(code);
            res.type('js').send(code);
            return;
        }

        let code = fs.readFileSync(modulePath, 'utf-8');

        // Detect if it’s CommonJS
        // const isCJS = code.includes('module.exports') || code.includes('exports.') || code.includes('require(');

        const isReactEsm =
            moduleName === 'react' ||
            moduleName.startsWith('react/') ||
            moduleName.startsWith('react-dom');

        if (isReactEsm) {
            code = rewriteImports(code);
            return res.type('js').send(code);
        }

        // Only transform actual CJS modules
        if (isCJS) {
            code = transformCjsToEsm(moduleName, modulePath);
        } else {
            code = rewriteImports(code);
        }

        // ESM module → just rewrite imports
        // code = `
        //     const process = { env: { NODE_ENV: 'development' } };
        //     const global = window;
        // ` + rewriteImports(code);
        res.type('js').send(code);
    });


    app.use(async (req, res, next) => {
        if (!req.path.endsWith('.css')) return next();

        const isModule = req.path.endsWith('.module.css');
        const filePath = path.resolve(project + req.path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).end();
        }

        const css = fs.readFileSync(filePath, 'utf-8');

        if (!isModule) {
            // --- Plain CSS → Convert to JS module ---
            res.type('js').send(`
            const css = ${JSON.stringify(css)};
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
            export default css;
        `);
            return;
        }

        // --- CSS Modules ---
        // SIMPLE Fake implementation (like Vite pre-scoped)
        // Real version hashes class names; this just prefixes them.
        const tokens = {};
        const processed = css.replace(/\.(\w[\w-]*)/g, (m, name) => {
            const newName = name + '_' + Math.random().toString(36).slice(2, 8);
            tokens[name] = newName;
            return '.' + newName;
        });

        res.type('js').send(`
        const css = ${JSON.stringify(processed)};
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        export default ${JSON.stringify(tokens)};
    `);
    });



    app.use((req, res, next) => {
        if (path.extname(req.path)) return next();

        const tryPaths = ['.js', '.jsx', '.ts', '.tsx'].map(ext => req.path + ext);
        for (const p of tryPaths) {
            const full = path.resolve('.' + p);
            if (fs.existsSync(full)) {
                req.url = p;
                return next();
            }
        }
        next();
    });

    app.use(async (req, res, next) => {
        if (!/\.(js|jsx|ts|tsx)$/.test(req.path)) return next();

        const file = path.resolve('.' + req.path);

        let code = fs.readFileSync(file, 'utf-8');

        // code = rewriteImports(code);
        code = await applyPlugins(plugins, 'transform', code, req.path);
        sendHMRUpdate(req.path);

        res.type('js').send(rewriteImports(code));
    });

    app.listen(3000, () =>
        console.log("Dev server running at http://localhost:3000")
    );
}

function rewriteImports(code) {
    return code.replace(/import\s*['"]([^'"]+)['"]/g, (match, spec) => {
        if (spec.startsWith('/') || spec.startsWith('./') || spec.startsWith('../')) return match;
        return match.replace(spec, '/@modules/' + spec);
    })
        // rewrite "import { x } from 'react'"
        .replace(/from\s*['"]([^'"]+)['"]/g, (match, spec) => {
            if (spec.startsWith('/') || spec.startsWith('./') || spec.startsWith('../')) return match;
            return match.replace(spec, '/@modules/' + spec);
        });
}

function transformCjsToEsm(moduleName, modulePath) {
    // const cjsCode = fs.readFileSync(modulePath, 'utf-8');

    const moduleExports = require(modulePath);
    console.log("moduleExports", moduleExports);

    const exportEntries = Object.entries(moduleExports).map(([key, value]) => {
        if (typeof value === 'function') {
            return `export const ${key} = (${value.toString()});`;
        } else {
            return `export const ${key} = ${JSON.stringify(value)};`;
        }
    }).join('\n');

    const defaultExport = `export default ${JSON.stringify(moduleExports)};`;

    return `
        ${exportEntries}
        ${defaultExport} 
    `;
}