import fs from "node:fs";
import path from "node:path";

export async function resolveBareImport(specifier, projectRoot) {

    const { pkgName, subpath } = getPackageNameandSubPath(specifier);
    const pkgRoot = findPackageRoot(pkgName, projectRoot);

    if (!pkgRoot) {
        throw new Error(`Cannot find Package ${pkgName}`);
    }

    const pkgJsonPath = path.join(pkgRoot, "package.json");
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
    console.log("pkgJson ============================================ \n", pkgJson)
    if (pkgJson.exports) {
        console.log("pkgJson.exports ========================================= \n", pkgJson.exports)
        const resolve = resolveExportField(pkgJson.exports, subpath);
        console.log("pkgJson.exports.resolve ========================================= \n", resolve)
        if (resolve) return path.join(pkgRoot, resolve);
    }

    console.log(`pkgJson.module && !subpath: ========================================= \n ${!subpath}`)
    if (pkgJson.module && !subpath) {
        console.log("pkgJson.modul ========================================= \n", pkgJson.modul)
        return path.join(pkgRoot, pkgJson.module);
    }
    console.log(`pkgJson.main && !subpath: ========================================= \n ${!subpath}`)

    if (pkgJson.main && !subpath) {
        console.log("pkgJson.main ========================================= \n", pkgJson.main)
        return path.join(pkgRoot, pkgJson.main);
    }

    const candidate = path.join(pkgRoot, subpath);
    console.log("candidate ========================================= \n", candidate)
    if (fs.existsSync(candidate)) return candidate;
    if (fs.existsSync(candidate + ".js")) return candidate + ".js";
    if (fs.existsSync(candidate + ".mjs")) return candidate + ".mjs";

    throw new Error(`Cannot resolve subpath "${subpath}" in package "${pkgName}"`);

}

function getPackageNameandSubPath(specifier) {
    const result = { pkgName: "", subpath: "" };
    const parts = specifier.split("/");
    if (specifier.startsWith("@")) {
        result.pkgName = parts.slice(0, 2).join("/");
        result.subpath = parts.slice(2).join("/");
    } else {
        result.pkgName = parts[0];
        result.subpath = parts.slice(1).join("/");
    }
    return result;
}

function findPackageRoot(pkgName, projectRoot) {
    let dir = projectRoot;
    while (dir !== "/") {
        const possible = path.join(dir, "node_modules", pkgName);
        if (fs.existsSync(possible)) return possible;
        dir = path.dirname(dir);
    }
    return null;
}

function resolveExportField(exportsField, subpath) {
    const exportKey = subpath ? `./${subpath}` : ".";
    const entry = exportsField[exportKey];
    if (!entry) return null;

    if (typeof entry === "string") {
        return entry;
    }

    const CONDITIONS_PRIORITY = [
        "import",
        "module",
        "browser",
        "default",
    ];

    for (const condition of CONDITIONS_PRIORITY) {
        console.log("condition=================================\n", condition);
        if (entry[condition]) {
            const target = entry[condition];
            if (typeof target === "string") return target;

            if (typeof target === "object") {
                if (target.import) return target.import;
                if (target.module) return target.module;
                if (target.browser) return target.browser
                if (target.default) return target.default;
            }
        }
    }

    return null;
}
