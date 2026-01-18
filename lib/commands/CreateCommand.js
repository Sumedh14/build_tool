import { create } from "../create-templates/create.js";

export class CreateCommand {
    constructor({ artifactPath, projectName, logger }) {
        this.artifactPath = artifactPath;
        this.projectName = projectName;
        this.logger = logger;
    }

    async execute() {
        this.logger?.info('CreateCommand: starting');
        await create(this.artifactPath, this.projectName);
        this.logger?.info('CreateCommand: done');
    }
}