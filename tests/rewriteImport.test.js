// tests/rewriteImports.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { rewriteImports } from '../lib/utils/rewriteImports.js';

describe('rewriteImports', () => {
    test('should rewrite bare imports', () => {
        const code = `import React from "react";`;
        const result = rewriteImports(code);
        assert(result.includes(`import React from "/@modules/react"`));
    });

    test('should not rewrite relative imports', () => {
        const code = `import Utils from "./utils";`;
        const result = rewriteImports(code);
        assert(result.includes(`import Utils from "./utils"`));
    });

    test('should not rewrite absolute imports', () => {
        const code = `import Utils from "/utils";`;
        const result = rewriteImports(code);
        assert(result.includes(`import Utils from "/utils"`));
    });

    test('should not rewrite scoped packages', () => {
        const code = `import Button from "@mui/Button";`;
        const result = rewriteImports(code);
        assert(result.includes(`@mui/Button`));
    });

    test('should handle multiple imports', () => {
        const code = `
            import React from "react";
            import { Component } from "react";
            import Utils from "./utils";
        `;
        const result = rewriteImports(code);
        assert(result.includes(`from "/@modules/react"`));
        assert(result.includes(`from "./utils"`));
    });

    test('should not rewrite imports in strings', () => {
        const code = `const msg = "import from react"; import React from "react";`;
        const result = rewriteImports(code);
        assert(result.includes(`"import from react"`));
        assert(result.includes(`from "/@modules/react"`));
    });

    test('should handle single quotes', () => {
        const code = `import React from 'react';`;
        const result = rewriteImports(code);
        assert(result.includes(`from '/@modules/react'`));
    });

    test('should handle export statements', () => {
        const code = `export { Component } from "react";`;
        const result = rewriteImports(code);
        assert(result.includes(`from "/@modules/react"`));
    });
});