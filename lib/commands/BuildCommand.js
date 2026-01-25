import { prodBuild } from '../build/prodBuild.js';
import createBuilder from '../utils/builder.js'

export class BuildCommand {
    constructor({ artifactPath, logger }) {
        this.artifactPath = artifactPath;
        this.logger = logger;
    }

    async execute() {
        const builder = createBuilder({ root: this.artifactPath, mode: 'production', logger: this.logger });
        await builder.hooks.runHook('buildStart', { root: this.artifactPath });
        const result = await prodBuild(this.artifactPath);
        await builder.hooks.runHook('buildEnd', result);
        return result;
    }
}