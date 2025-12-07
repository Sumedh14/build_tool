#!/usr/bin/env node
// import { devServer } from '../lib/dev.js';
import { devServer } from '../lib/server/index.js';
// import { prodBuild } from '../lib/build.js';

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
    case 'prod':
        // prodBuild(artifactPath);
        break;
    default:
        console.log(`
            Usage:
            rbuild dev --artifactPath=/path_to_react_project    "Start dev server"
            rbuild prod --artifactPath=/path_to_react_project   "Build for production"
        `);
};