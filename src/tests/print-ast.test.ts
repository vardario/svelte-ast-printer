import { parse } from 'svelte/compiler';
import { describe, expect, test } from 'vitest';
import printAst from '../print-ast';

function testPrintAst(code: string, expectedResult?: string) {
  const ast = parse(code);
  const result = printAst({
    ast,
    indent: {
      indent: '',
      lineEnd: ''
    }
  });
  expect(result).toBe(expectedResult ?? code);
  parse(result);
}

describe('print-ast', () => {
  test('simple', () => {
    testPrintAst('<script>let a;</script><main>Hello,World</main>');
  });

  test('with module', () => {
    testPrintAst('<script context="module">let b;</script><script>let a;</script><main>Hello,World</main>');
  });
});
