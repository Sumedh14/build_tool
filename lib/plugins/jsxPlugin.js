import { transformAsync } from '@babel/core';

export default function jsxPlugin() {
    return {
        name: 'react-jsx',
        async transform(code, id) {
            if (!id.endsWith('.jsx') && !id.endsWith('.tsx')) return code;

            const result = await transformAsync(code, {
                filename: id,
                presets: [
                    ['@babel/preset-react', { runtime: 'automatic' }]
                ],
                sourceMaps: true
            });

            return result.code;
        }
    }
}
