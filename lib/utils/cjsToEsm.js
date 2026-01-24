import path from "node:path";
import fs from "node:fs"
export function convertImports(code) {
    let out = code;


    const applyExtensionRule = (mod) => {
        if (mod.startsWith('.') || mod.startsWith('/')) {
            const ext = path.extname(mod);
            if (!ext && !mod.endsWith('/')) {
                return mod + '.js';
            }
        }
        return mod;
    };

    // Handle require with property access FIRST: const x = require('mod').prop;
    out = out.replace(
        /const\s+(\w+)\s*=\s*require\(["'`](.*?)["'`]\)\.(\w+);?/g,
        (match, name, mod, member) => {
            const modPath = applyExtensionRule(mod);
            return `import { ${member} as ${name} } from "${modPath}";`;
        }
    );

    // Handle destructured requires: const { x, y } = require('mod');
    out = out.replace(/const\s*{([^}]+)}\s*=\s*require\(["'`](.*?)["'`]\)/g,
        (_, names, mod) => {
            const modPath = applyExtensionRule(mod);
            const esmNames = names.trim()
                .split(',')
                .map(part => {
                    const parts = part.split(':').map(s => s.trim());
                    if (parts.length === 2) {
                        return `${parts[0]} as ${parts[1]}`;
                    }
                    return part.trim();
                })
                .join(', ');
            return `import { ${esmNames} } from "${modPath}";`;
        });

    // Handle default requires: const x = require('mod');
    out = out.replace(/const\s+(\w+)\s*=\s*require\(["'`](.*?)["'`]\);?/g,
        (_, name, mod) => {
            const modPath = applyExtensionRule(mod);
            // For local files, always use default import
            if (mod.startsWith('.') || mod.startsWith('/')) {
                return `import ${name} from "${modPath}";`;
            }
            // For packages, use namespace import if variable is used with property access
            const namespaceRegex = new RegExp(`\\b${name}\\.\\w+\\s*\\(`, 'g');
            const matches = out.match(namespaceRegex);
            if (matches && matches.length > 0) {
                return `import * as ${name} from "${modPath}";`;
            }
            return `import ${name} from "${modPath}";`;
        });

    // Handle require() calls as function invocation
    out = out.replace(
        /const\s+(\w+)\s*=\s*require\(["'`](.*?)["'`]\)\((.*?)\);?/g,
        (_, name, mod, args) =>
            `import ${name}Factory from "${applyExtensionRule(mod)}";\nconst ${name} = ${name}Factory(${args});`
    );

    // Handle side-effect requires: require('./style.css');
    out = out.replace(/(?<!=\s*)require\(["'`](.*?)["'`]\);?/g,
        (_, mod) => {
            const modPath = applyExtensionRule(mod);
            return `import "${modPath}";`;
        });

    return out;
}

export function convertExports(code) {
    let out = code;
    // Must process module.exports.name before general exports.name
    out = out.replace(/module\.exports\.(\w+)\s*=\s*([^\n;]+);?/g, 'export const $1 = $2;');
    out = out.replace(/exports\.(\w+)\s*=\s*([^\n;]+);?/g, 'export const $1 = $2;');
    out = out.replace(/module\.exports\s*=\s*([^\n;]+);?/g, 'export default $1;');
    out = out.replace(
        /Object\.defineProperty\(\s*exports\s*,\s*["'](\w+)["']\s*,\s*\{[\s\S]*?value:\s*([^\n,}\s]+)[\s\S]*?\}\s*\);?/g,
        'export const $1 = $2;'
    );
    out = out.replace(
        /module\.exports\s*=\s*\{\s*([^}]+)\s*\};?/g,
        (_, props) => {
            const exports = props.split(',').map(prop => {
                const [name, value] = prop.split(':').map(s => s.trim());
                return `export const ${name || prop.trim()} = ${value || name.trim()};`;
            }).join('\n');
            return exports;
        });
    return out;
}

export function convertDynamicRequire(code, filePath) {
    let out = code;

    const hasDynamicRequire = /require\(([^)]*)\)/.test(out);
    out = out.replace(/require\(([^)]*)\)/g,
        (_, expr) => {
            return `(await import(${expr})).default`;
        }
    );

    const containsStaticImport = /^import\s/m.test(out);

    if (hasDynamicRequire && !containsStaticImport &&
        !out.includes('async function') &&
        !out.includes('(async () =>') &&
        !out.includes('import.meta.url')) {
        console.warn(`[CJS] Wrapping ${path.basename(filePath)} in async IIFE due to dynamic require.`);
        out = `(async () => {\n${out}\n})();`;
    }

    return out;
}

export function rewriteExtensions(code, filePath) {
    // For now, don't rewrite extensions - the applyExtensionRule in convertImports handles this
    return code;
}

export function convertCjsToEsm(code, filePath) {
    let out = code;
    out = convertImports(out);
    out = convertExports(out);
    out = convertDynamicRequire(out, filePath);
    out = rewriteExtensions(out, filePath);
    out = out.replace(/\b__filename\b/g, 'import.meta.url');
    out = out.replace(/\b__dirname\b/g, 'path.dirname(import.meta.url)');
    return out;
}