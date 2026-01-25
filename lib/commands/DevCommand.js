import { devServer } from "../server/index.js";
import createBuilder from '../utils/builder.js';

export class DevCommand {
    constructor({ artifactPath, logger }) {
        this.artifactPath = artifactPath;
        this.logger = logger;
    }

    async execute() {
        const builder = createBuilder({ root: this.artifactPath, mode: "developement", logger: this.logger });
        await devServer(this.artifactPath, { builder });
        return builder.watch();
    }
}