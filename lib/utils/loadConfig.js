// lib/utils/loadConfig.js
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "fs";

export async function loadConfig() {

    console.log("cwd", process.cwd());


    const projectConfigPath = path.resolve(process.cwd(), "rbuild.config.js");
    let projectConfig = {};
    if (fs.existsSync(projectConfigPath)) {
        const fileURL = pathToFileURL(projectConfigPath).href;
        const configModule = await import(fileURL);
        projectConfig = configModule.default || {};
        console.log("Loaded project config:", projectConfig);
    }

    const defaultConfigPath = path.resolve(fileURLToPath(new URL("../../rbuild.config.js", import.meta.url)));
    let defaultConfig = { plugins: [] };
    if (fs.existsSync(defaultConfigPath)) {
        const fileURL = pathToFileURL(defaultConfigPath).href;
        const configModule = await import(fileURL);
        defaultConfig = configModule.default || { plugins: [] };
        console.log("Loaded default build-tool config:", defaultConfig);
    }

    return {
        plugins: projectConfig.plugins || defaultConfig.plugins
    };
}