import { CreateCommand } from './commands/CreateCommand.js';
import { DevCommand } from './commands/DevCommand.js';
import { BuildCommand } from './commands/BuildCommand.js';
import { ProdRunCommand } from './commands/ProdRunCommand.js';
import { Logger } from '../lib/utils/logger.js';

const logger = new Logger('cli');

export async function runCli(argv = []) {
    const cmd = argv[0] || 'help';
    let artifactPath = process.cwd();
    let projectName = '';

    for (const arg of argv) {
        if (arg.startsWith('--artifactPath=')) artifactPath = arg.split('=')[1];
    }
    if (argv[1] && !argv[1].startsWith('--')) projectName = argv[1];

    switch (cmd) {
        case 'create':
            return new CreateCommand({ artifactPath, projectName, logger }).execute();
        case 'dev':
            return new DevCommand({ artifactPath, logger }).execute();
        case 'build':
            return new BuildCommand({ artifactPath, logger }).execute();
        case 'prodRun':
        case 'prod':
            return new ProdRunCommand({ artifactPath, logger }).execute();
        default:
            logger.info(`Unknown command: ${cmd}`);
            logger.info(`
Usage:        
        npm run create <project-name> --artifactPath=/path_to_react_project  "Create new React Project"
        npm run dev --artifactPath=/path_to_react_project                    "Start dev server"
        npm run build --artifactPath=/path_to_react_project                  "Build for production"
        npm run prod --artifactPath=/path_to_react_project                   "Test the build project locally" 
`);
    }
}