import { prodBuild } from "../build/prodBuild.js";

export class BuildCommand {
    constructor({ artifactPath, logger }) {
        this.artifactPath = artifactPath;
        this.logger = logger;
    }

    async execute() {
        const builder = createBuilder({ root: this.artifactPath, mode: 'production', logger: this.logger });
        await builder.hook.runHook('buildStart', { root: this.artifactPath });
        const result = await prodBuild(this.artifactPath);
        await builder.hooks.runHook('buildEnd', result);
        return result;
    }
}