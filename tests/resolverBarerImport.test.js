import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { resolveBareImport } from '../lib/utils/resolveBarerImports.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testProjectRoot = path.join(__dirname, 'fixtures', 'test-project');

describe('resolveBareImport', () => {
    before(() => {
        // Create test fixtures
        // Always ensure directories exist
        fs.mkdirSync(path.join(testProjectRoot, 'node_modules', '@scope', 'scoped-pkg', 'lib'), { recursive: true });
        fs.mkdirSync(path.join(testProjectRoot, 'node_modules', 'simple-pkg'), { recursive: true });
        
        // Create package.json files
        fs.writeFileSync(
            path.join(testProjectRoot, 'node_modules', 'simple-pkg', 'package.json'),
            JSON.stringify({ name: 'simple-pkg', main: 'index.js' })
        );
        fs.writeFileSync(
            path.join(testProjectRoot, 'node_modules', 'simple-pkg', 'index.js'),
            'export default {};'
        );

        fs.writeFileSync(
            path.join(testProjectRoot, 'node_modules', '@scope', 'scoped-pkg', 'package.json'),
            JSON.stringify({ name: '@scope/scoped-pkg', main: 'lib/index.js' })
        );
        fs.writeFileSync(
            path.join(testProjectRoot, 'node_modules', '@scope', 'scoped-pkg', 'lib', 'index.js'),
            'export default {};'
        );
    });

    after(() => {
        // Clean up test fixtures
        if (fs.existsSync(testProjectRoot)) {
            fs.rmSync(testProjectRoot, { recursive: true });
        }
    });

    test('should resolve simple package', async () => {
        const result = await resolveBareImport('simple-pkg', testProjectRoot);
        assert(result.includes('simple-pkg'));
        assert(result.includes('index.js'));
    });

    test('should resolve scoped package', async () => {
        const result = await resolveBareImport('@scope/scoped-pkg', testProjectRoot);
        assert(result.includes('@scope'));
        assert(result.includes('scoped-pkg'));
    });

    test('should throw error for non-existent package', async () => {
        try {
            await resolveBareImport('non-existent-pkg', testProjectRoot);
            assert.fail('Should have thrown error');
        } catch (error) {
            assert(error.message.includes('Cannot find Package'));
        }
    });
});