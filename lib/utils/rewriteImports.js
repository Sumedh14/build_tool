export function rewriteImports(code) {
    return code.replace(/((?:^|[;\n])\s*(?:import|export)[^;]*?\bfrom\s+)['"]([^'".][^'"]*)['"]/gm, (match, prefix, specifier) => {
        const quote = match.match(/['"]$/)[0];
        if (!specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('@')) {
            return `${prefix}${quote}/@modules/${specifier}${quote}`;
        }
        return match;
    });
}
