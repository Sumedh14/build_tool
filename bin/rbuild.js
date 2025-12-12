#!/usr/bin/env node
// import { devServer } from '../lib/dev.js';
import { devServer } from '../lib/server/index.js';
// import { prodBuild } from '../lib/build.js';
import { prodBuild } from '../lib/build/prodBuild.js';
import { prodRun } from '../lib/prodProject/distProjectRun.js';

const args = process.argv.slice(2);
const cmd = args[0];
let artifactPath = process.cwd();
for (const arg of args) {
    if (arg.startsWith("--artifactPath=")) {
        artifactPath = arg.split("=")[1];
    }
}

switch (cmd) {
    case 'dev':
        devServer(artifactPath);
        break;
    case 'build':
        prodBuild(artifactPath);
        break;
    case 'prodRun':
        prodRun(artifactPath);
        break;
    default:
        console.log(`
        '${cmd}' not found.

        Usage:

        npm run dev --artifactPath=/path_to_react_project    "Start dev server"
        npm run build --artifactPath=/path_to_react_project  "Build for production"
        npm run prod --artifactPath=/path_to_react_project   "Test the build project locally" 
        `);
};