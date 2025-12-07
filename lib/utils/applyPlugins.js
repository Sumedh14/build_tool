
export async function applyPlugins(plugins, hook, code, id) {
    let result = code;

    for (const plugin of plugins) {
        if (plugin[hook]) {
            result = await plugin[hook](result, id);
        }
    }
    return result;
}