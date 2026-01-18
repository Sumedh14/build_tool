import { prodRun } from '../prodProject/distProjectRun.js';

export class ProdRunCommand {
    constructor({ artifactPath, logger }) {
        this.artifactPath = artifactPath;
        this.logger = logger;
    }

    async execute() {
        this.logger?.info('Running production artifact locally...');
        return prodRun(this.artifactPath);
    }
}