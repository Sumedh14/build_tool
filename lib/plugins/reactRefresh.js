import babel from '@babel/core'
import reactRefresh from "react-refresh/babel";

// export default function reactRefreshPlugin() {
//     return {
//         name: 'react-refresh',
//         async transform(code, id) {
//             if (!id.endsWith('.jsx') && !id.endsWith('.tsx')) return code;

//             const result = await babel.transform(code, {
//                 filename: id,
//                 presets: [["@babel/preset-react", { runtime: 'automatic' }]],
//                 plugins: [reactRefresh],
//                 sourceMaps: 'inline',
//             }).code;

//             if (!result || !result.code) return code;
//             return result.code;
//         }
//     }
// }

export default function reactRefreshPlugin() {
    return {
        name: 'react-refresh',
        async transform(code, id) {
            if (!id.endsWith('.jsx') && !id.endsWith('.tsx')) return code;

            const result = await babel.transformAsync(code, {
                filename: id,
                presets: [['@babel/preset-react', { runtime: 'automatic' }]],
                plugins: [reactRefresh],
                sourceMaps: 'inline',
            });

            if (!result || !result.code) {
                console.error(`Babel failed to transform: ${id}`);
                return code;
            }

            return result.code;
        },
    };
}
