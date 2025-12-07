import fs from 'node:fs';

export default function cssPlugin() {
    return {
        name: 'css',
        transform(code, id) {
            if (!id.endsWith('.css')) return code;

            const css = fs.readFileSync(id, 'utf-8');
            return `const style = document.createElement('style');
            style.innerHTML = ${JSON.stringify(css)};
            document.head.appendChild(style);
            export default {};
            `;
        },
    };
}


