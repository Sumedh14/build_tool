// tests/integration.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { convertCjsToEsm } from '../lib/utils/cjsToEsm.js';

describe('Integration Tests', () => {
    describe('CommonJS to ESM Conversion Pipeline', () => {
        test('should convert and preserve functionality', () => {
            const cjsCode = `
                const helper = require('./helper');
                const { utils } = require('utils-pkg');
                
                exports.process = function(data) {
                    return helper.parse(data);
                };
                
                module.exports.version = '1.0.0';
            `;

            const result = convertCjsToEsm(cjsCode, 'test.js');

            assert(result.includes('import'));
            assert(result.includes('export'));
            assert(result.includes('./helper.js'));
        });
    });

    describe('Import Rewriting', () => {
        test('should create valid module-based imports', () => {
            function rewriteImports(code) {
                return code.replace(/((?:^|\n)\s*(?:import|export)[^;]*?\bfrom\s+)['"]([^'".][^'"]*)['"]/gm, (match, prefix, specifier) => {
                    if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
                        return `${prefix}'/@modules/${specifier}'`;
                    }
                    return match;
                });
            }

            const code = `
                import React from "react";
                import { BrowserRouter } from "react-router-dom";
                import { create } from "zustand";
                import Utils from "./utils";
            `;

            const result = rewriteImports(code);
            assert(result.includes('/@modules/react'));
            assert(result.includes('/@modules/react-router-dom'));
            assert(result.includes('/@modules/zustand'));
            assert(result.includes('./utils'));
        });
    });
});