export default function envPlugin() {
    return {
        name: 'env',
        tranform(code) {
            return code.replace(/import\.meta\.env\.([A_Z0-9_]+)/g, (_, key) => {
                return JSON.stringify(process.env[key] || '');
            });
        },
    };
}