import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import * as path from 'node:path';
import * as fs from 'node:fs';

import { rollup } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import url from '@rollup/plugin-url';
import alias from '@rollup/plugin-alias';
import { babel } from '@rollup/plugin-babel';

export async function prodBuild(artifactPath) {

    const project = path.resolve(artifactPath);
    console.log("artifacts", artifactPath)
    const srcPath = path.join(project, 'src');
    const distPath = path.join(project, 'dist');
    const entryFile = path.join(srcPath, 'main.jsx');

    if (!fs.existsSync(srcPath)) {
        console.error(`\n Error: Source directory not found at ${srcPath}`);
        console.error(" Please ensure the project structure is correct (requires a 'src' folder).");
        return;
    }

    if (fs.existsSync(distPath)) {
        console.log(`\n Cleaning existing distribution folder: ${distPath}`);
        fs.rmSync(distPath, { recursive: true, force: true });
        console.log(" Cleanup complete. \n");
    }

    fs.mkdirSync(distPath, { recursive: true });

    const rollupConfig = {
        input: entryFile,
        plugins: [
            alias({
                entries: [],
            }),
            resolve({
                browser: true,
            }),
            commonjs(),
            postcss({
                extract: 'style.css',
                minimize: true,
            }),
            url({
                limit: 10 * 1024,
            }),
            babel({
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
                babelHelpers: 'bundled',
                presets: [[require.resolve('@babel/preset-env'), { targets: { esmodules: true } }],
                [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
                require.resolve('@babel/preset-typescript')],
                exclude: 'node_modules/**'

            }),
            replace({
                preventAssignment: true,
                'process.env.NODE_ENV': JSON.stringify('production'),
            }),
            terser({
                compress: {
                    drop_console: true,
                    drop_debugger: true,
                },
            }),
        ]
    }

    try {
        const bundle = await rollup(rollupConfig);

        await bundle.write({
            dir: distPath,
            format: 'esm',
            sourcemap: false,
            entryFileNames: 'bundle.[hash].js',
            chunkFileNames: 'chunk.[hash].js',
            assetFileNames: 'assets/[name].[hash][extname]',
            manualChunks(id) {
                if (id.includes('node_modules')) {
                    return 'vendor';
                }
            },
        })
    } catch (error) {
        console.error("Rollup Build Failed:", error);
        return;
    }

    const distFiles = fs.readdirSync(distPath);
    const mainBundle = distFiles.find(file => file.startsWith('bundle') && file.endsWith('js'));
    const cssBundle = distFiles.find(file => file.endsWith('.css'));

    let html = `<html>
    <head>
        <meta charset="utf-8">
        <title>RBuild App</title>`;

    if (cssBundle) {
        html += `\n <link rel="stylesheet" href="${cssBundle}">`;
    }

    html += `
    </head>
    <body>
        <div id="root"></div>
        <script type="module" src="${mainBundle}"></script>
    </body>
    </html>`;

    fs.writeFileSync(path.join(distPath, 'index.html'), html);

    console.log("\n Production build complete.");
}