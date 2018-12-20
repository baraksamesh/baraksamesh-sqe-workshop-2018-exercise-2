import assert from 'assert';
import {codeToArray} from '../src/js/code-analyzer';
import * as escodegen from 'escodegen';

describe('The javascript parser', () => {
    it('parsing code with only while statement', () => {
        assert.equal(escodegen.generate(codeToArray('function foo(x, y, z) { while(x < 4){} }', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    while (x < 4) {\n'+
                    '    }\n'+
                    '}');
    });

    it('parsing code with only if statement', () => {
        assert.equal(escodegen.generate(codeToArray('function foo(x, y, z) { if(x){} }', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    if (x) {\n'+
                    '    }\n'+
                    '}');
    });
    it('parsing code with local variable declerations', () => {
        assert.equal(escodegen.generate(codeToArray('function foo(x, y, z){let a = 4;}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '}');
    });
    it('parsing code with assignment to parameter of local var', () => {
        assert.equal(escodegen.generate(codeToArray('function foo(x, y, z){let a = 4;x = a;}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    x = 4;\n'+
                    '}');
    });
    it('parsing code with returning locals', () => {
        assert.equal(escodegen.generate(codeToArray('function foo(x, y, z){let a = 4, b=x+y;return a;}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    return 4;\n'+
                    '}');
    });
    it('parsing code with else, testing versions, testing variables version ()', () => {
        assert.equal(escodegen.generate(codeToArray('function foo(x, y, z){let a = 1,b;if(a){x =a+2;a = 3;}else{x=a+3;}}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    if (1) {\n'+
                    '        x = 1 + 2;\n'+
                    '    } else {\n'+
                    '        x = 1 + 3;\n'+
                    '    }\n'+
                    '}');
    });
    it('parsing code with array element on condition', () => {
        assert.equal(escodegen.generate(codeToArray('function foo(x, y, z){let a = [true, false];if(a[0])x=4;}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    if (true)\n'+
                    '        x = 4;\n'+
                    '}');
    });
    it('parsing code with globals', () => {
        assert.equal(escodegen.generate(codeToArray('let g = 2;function foo(x, y, z){let a = 4, b=g+y;}', '1;2;3')),
                    'let g = 2;\n'+
                    'function foo(x, y, z) {\n'+
                    '}');
    });
    it('parsing code with vardec with local', () => {
        assert.equal(escodegen.generate(codeToArray('function foo(x, y, z){let a = 4;let b = a;}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '}');
    });
    it('parsing code with binary condition', () => {
        assert.equal(escodegen.generate(codeToArray('function foo(x, y, z){let a = 4;let b = a + 1;if(a<x+y){}}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    if (4 < x + y) {\n'+
                    '    }\n'+
                    '}');
    });
    it('parsing code with single exp while', () => {
        assert.equal(escodegen.generate(codeToArray('function foo(x, y, z){while(x) x=4;}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    while (x)\n'+
                    '        x = 4;\n'+
                    '}');
    });
    it('parsing code with single exp if', () => {
        assert.equal(escodegen.generate(codeToArray('function foo(x, y, z){if(x) x=4;else x=5;}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    if (x)\n'+
                    '        x = 4;\n'+
                    '    else\n'+
                    '        x = 5;\n'+
                    '}');
    });
    it('parsing code with array assignment', () => {
        assert.equal(escodegen.generate(codeToArray('function foo(x, y, z){let a = [2];x = a[0];}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    x = 2;\n'+
                    '}');
    });
    it('parsing code with array condition', () => {
        assert.equal(escodegen.generate(codeToArray('function foo(x, y, z){let a = [2,4];if(a[0]<a[1]){}}', '1;2;3')),
                    'function foo(x, y, z) {\n'+
                    '    if (2 < 4) {\n'+
                    '    }\n'+
                    '}');
    });
});
