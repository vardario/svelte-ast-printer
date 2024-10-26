import { parse } from 'svelte/compiler';
import { describe, expect, test } from 'vitest';
import printScript from '../print-script';

function testScriptPrinter(code: string, expectedResult?: string) {
  const ast = parse(code);
  const result = printScript({
    script: ast.module ?? ast.instance!,
    ident: {
      indent: '',
      lineEnd: ''
    }
  });
  expect(result, expectedResult ?? code);
}

// describe('<script>', () => {
//   test('simple instance', () => {
//     testScriptPrinter('<script>let a;</script>');
//   });

//   test('simple module', () => {
//     testScriptPrinter('<script context="module">let a;</script>');
//   });
// });
