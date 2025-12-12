#!/usr/bin/env node
// import { devServer } from '../lib/dev.js';
import { devServer } from '../lib/server/index.js';
// import { prodBuild } from '../lib/build.js';
import { prodBuild } from '../lib/build/prodBuild.js';
import { prodRun } from '../lib/prodProject/distProjectRun.js';
import { create } from '../lib/create-templates/create.js';
const args = process.argv.slice(2);
const cmd = args[0];
let artifactPath = process.cwd();
let projectName = "";
for (const arg of args) {
    if (arg.startsWith("--artifactPath=")) {
        artifactPath = arg.split("=")[1];
    }
    if (!arg.startsWith("--artifactPath=") && arg[1]) {
        projectName = args[1];
    }
}

switch (cmd) {
    case 'create':
        create(artifactPath, projectName);
        break;
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
        
        npm run create <project-name> --artifactPath=/path_to_react_project  "Create new React Project"
        npm run dev --artifactPath=/path_to_react_project                    "Start dev server"
        npm run build --artifactPath=/path_to_react_project                  "Build for production"
        npm run prod --artifactPath=/path_to_react_project                   "Test the build project locally" 
        `);
};