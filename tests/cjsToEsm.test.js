// tests/cjsToEsm.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
    convertImports,
    convertExports,
    convertDynamicRequire,
    convertCjsToEsm
} from '../lib/utils/cjsToEsm.js';

describe('convertImports', () => {
    test('should convert default require to default import', () => {
        const code = `const express = require('express');`;
        const result = convertImports(code);
        assert(result.includes(`import express from "express"`));
    });

    test('should convert destructured require to named imports', () => {
        const code = `const { readFile } = require('fs');`;
        const result = convertImports(code);
        assert(result.includes(`import { readFile } from "fs"`));
    });

    test('should handle require with property access', () => {
        const code = `const path = require('path').resolve;`;
        const result = convertImports(code);
        assert(result.includes(`import { resolve as path }`));
    });

    test('should add .js extension to relative imports', () => {
        const code = `const utils = require('./utils');`;
        const result = convertImports(code);
        assert(result.includes(`import utils from "./utils.js"`));
    });

    test('should handle namespace imports when module property is accessed', () => {
        const code = `const React = require('react'); React.createElement();`;
        const result = convertImports(code);
        assert(result.includes(`import * as React from "react"`));
    });

    test('should convert side-effect requires to imports', () => {
        const code = `require('./styles.css');`;
        const result = convertImports(code);
        assert(result.includes(`import "./styles.css"`));
    });

    test('should handle multiple requires', () => {
        const code = `const fs = require('fs'); const path = require('path');`;
        const result = convertImports(code);
        assert(result.includes(`import fs from "fs"`));
        assert(result.includes(`import path from "path"`));
    });

    test('should handle backticks in require', () => {
        const code = 'const mod = require(`./module`);';
        const result = convertImports(code);
        assert(result.includes(`import mod from "./module.js"`));
    });
});

describe('convertExports', () => {
    test('should convert named exports', () => {
        const code = `exports.foo = 42;`;
        const result = convertExports(code);
        assert(result.includes(`export const foo = 42`));
    });

    test('should convert module.exports.name syntax', () => {
        const code = `module.exports.helper = () => {};`;
        const result = convertExports(code);
        assert(result.includes(`export const helper = () => {}`));
    });

    test('should convert default exports', () => {
        const code = `module.exports = MyClass;`;
        const result = convertExports(code);
        assert(result.includes(`export default MyClass`));
    });

    test('should handle Object.defineProperty exports', () => {
        const code = `Object.defineProperty(exports, 'myExport', { value: 42 });`;
        const result = convertExports(code);
        assert(result.includes(`export const myExport = 42`));
    });

    test('should handle multiple exports', () => {
        const code = `exports.a = 1; exports.b = 2;`;
        const result = convertExports(code);
        assert(result.includes(`export const a = 1`));
        assert(result.includes(`export const b = 2`));
    });
});

describe('convertDynamicRequire', () => {
    test('should convert dynamic require to dynamic import', () => {
        const code = `const mod = require(moduleName);`;
        const result = convertDynamicRequire(code, 'test.js');
        assert(result.includes(`(await import(moduleName)).default`));
    });

    test('should wrap code with async IIFE when needed', () => {
        const code = `const mod = require('some-module');`;
        const result = convertDynamicRequire(code, 'test.js');
        assert(/\(async \(\) => \{[\s\S]*\}\)\(\)/.test(result));
    });

    test('should not wrap when async function already exists', () => {
        const code = `async function load() { const mod = require('mod'); }`;
        const result = convertDynamicRequire(code, 'test.js');
        assert(!/^\(async \(\) => \{[\s\S]*\}\)\(\)/.test(result));
    });

    test('should not wrap when import.meta.url exists', () => {
        const code = `const url = import.meta.url; const mod = require('mod');`;
        const result = convertDynamicRequire(code, 'test.js');
        assert(!/^\(async \(\) => \{[\s\S]*\}\)\(\)/.test(result));
    });
});

describe('convertCjsToEsm', () => {
    test('should convert complete CommonJS module', () => {
        const code = `const fs = require('fs'); exports.read = fs.readFileSync;`;
        const result = convertCjsToEsm(code, 'test.js');
        assert(result.includes(`import fs from "fs"`));
        assert(result.includes(`export const read = fs.readFileSync`));
    });

    test('should replace __filename with import.meta.url', () => {
        const code = `const file = __filename;`;
        const result = convertCjsToEsm(code, 'test.js');
        assert(result.includes(`import.meta.url`));
    });

    test('should replace __dirname with path.dirname(import.meta.url)', () => {
        const code = `const dir = __dirname;`;
        const result = convertCjsToEsm(code, 'test.js');
        assert(result.includes(`path.dirname(import.meta.url)`));
    });

    test('should handle complex real-world scenario', () => {
        const code = `
            const path = require('path');
            const { readFile } = require('fs');
            
            exports.getPath = () => __dirname;
            exports.read = readFile;
            
            module.exports.join = path.join;
        `;
        const result = convertCjsToEsm(code, 'test.js');
        assert(result.includes(`import path from "path"`));
        assert(result.includes(`import { readFile } from "fs"`));
        assert(result.includes(`export const`));
    });
});