import reactRefreshPlugin from "./lib/plugins/reactRefresh.js";
import cssPlugin from "./lib/plugins/css.js";
import cssModulePlugin from "./lib/plugins/cssModule.js";
import envPlugin from "./lib/plugins/env.js";
import jsxPlugin from "./lib/plugins/jsxPlugin.js";

export default {
    plugins: [
        envPlugin(),
        cssPlugin(),
        cssModulePlugin(),
        jsxPlugin(),
        reactRefreshPlugin()
    ]
};