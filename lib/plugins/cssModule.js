import fs from 'node:fs';
import crypto from 'node:crypto'

export default function cssModulePlugin() {
    return {
        name: 'css-modules',
        transform(code, id) {
            if (!id.endsWith('.module.css')) return code;

            const css = fs.readFileSync(id, 'utf-8');

            const classMap = {};
            const tranformed = css.replace(/\.([a-zA-Z0-9_-]+)/g, (_, cls) => {
                const hash = crypto.randomBytes(4).toString('hex');
                classMap[cls] = `${cls}_${hash}`;
                return `.${classMap[cls]}`;
            });

            return `const style = document.createElement('style');
            style.innerHTML = ${JSON.stringify(tranformed)};
            document.head.appendChild(style);
            export default ${JSON.stringify(classMap)};
            `;
        },
    };
}