import esbuild from 'esbuild';
import express from 'express';
import chokidar from 'chokidar';
import { WebSocketServer } from 'ws';
import path from 'node:path';
import fs from 'node:fs';

export async function devServer(artifactPath) {
    const project = path.resolve(artifactPath);
    const srcPath = path.join(project, 'src');
    const distPath = path.join(project, 'dist');

    console.log("Using project:", project);

    fs.mkdirSync(distPath, { recursive: true });

    const ctx = await esbuild.context({
        entryPoints: [path.join(srcPath, 'main.jsx')],
        bundle: true,
        outfile: path.join(distPath, 'bundle.js'),
        sourcemap: true,
        loader: {
            '.js': 'jsx',
            '.jsx': 'jsx'
        }
    });

    await ctx.rebuild();

    const wss = new WebSocketServer({ port: 5001 });

    chokidar.watch(srcPath).on('change', async () => {
        await ctx.rebuild();
        wss.clients.forEach((content) => content.send('reload'));
    });

    const app = express();

    app.use(express.static(distPath));

    app.get(express.static(distPath));

    app.get('/', (req, res) => {
        res.send(`
            <html>
            <body>
            <div id="root"></div>
            <script src="/bundle.js"></script>
            <script>
                const ws = new WebSocket("ws://localhost:5001");
                ws.onmessage = () => location.reload();
            </script>
            </body>
            </html>
        `);
    });

    app.listen(3000, () =>
        console.log("Dev server at http://localhost:3000")
    );
}