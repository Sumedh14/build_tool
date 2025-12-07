import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

export async function prodBuild(artifactPath) {
    const project = path.resolve(artifactPath);
    const srcPath = path.join(project, 'src');
    const distPath = path.join(project, 'dist');

    fs.mkdirSync(distPath, { recursive: true });

    await esbuild.build({
        entryPoints: [path.join(srcPath, 'main.jsx')],
        bundle: true,
        minify: true,
        outfile: path.join(distPath, 'bundle.js'),
        loader: {
            ".js": "jsx",
            ".jsx": "jsx"
        }
    });

    fs.writeFileSync(path.join(distPath, 'index.html'),
        `<html>
        <body>
            <div id="root"></div>
            <script src="bundle.js"></script>
        </body>
        </html>
    `)

    console.log("Production build complete.");
}