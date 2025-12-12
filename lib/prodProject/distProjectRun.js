import express from 'express';
import * as path from 'node:path';
import * as fs from 'node:fs';


export async function prodRun(artifactPath) {
    // Define the directory where your built files are located
    const DIST_PATH = path.resolve(path.join(`${artifactPath}`, 'dist'));
    const PORT = 3000;
    if (!fs.existsSync(DIST_PATH)) {
        console.error(`\n Error: Distribution directory not found!`);
        console.error(`   Expected path: ${DIST_PATH}`);
        console.error(`   Please run the production build (npm run build) first.`);

        process.exit(1);
    }
    const app = express();

    app.use(express.static(DIST_PATH));

    app.listen(PORT, () => {
        console.log(`\n Production files served correctly!`);
        console.log(`   View your app at: http://localhost:${PORT}`);
        console.log(`   (Press Ctrl+C to stop the server)\n`);
    });
}
