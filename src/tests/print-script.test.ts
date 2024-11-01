import { parse } from 'svelte/compiler';
import { describe, expect, test } from 'vitest';
import printScript from '../print-script';

function testScriptPrinter(code: string, expectedResult?: string) {
  const root = parse(code);
  const result = printScript(root, {
    indent: '',
    lineEnd: ''
  });
  expect(result, expectedResult ?? code);
}

describe('<script>', () => {
  test('instance', () => {
    testScriptPrinter('<script>let a;</script>');
  });

  test('module', () => {
    testScriptPrinter('<script context="module">let a;</script>');
  });

  test('instance && module', () => {
    testScriptPrinter('<script>let a;</script><script context="module">let a;</script>');
  });
});
