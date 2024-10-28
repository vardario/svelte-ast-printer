import type {  AST } from 'svelte/src/compiler/types/template.js';
import { DefaultPrinterIdentOptions, PrinterIdentOptions, printHtml, printScript } from './index.js';

export interface PrintAstParams {
  ast: AST.Root;
  indent?: PrinterIdentOptions;
}

export default function printAst(params: PrintAstParams): string {
  const { ast } = params;
  const ident = {
    ...DefaultPrinterIdentOptions,
    ...params.indent
  };

  const markup = printHtml({
    rootNode: ast.html,
    ident
  });

  const scriptInstance = ast.instance ? printScript({ script: ast.instance, ident }) : '';
  const scriptModule = ast.module ? printScript({ script: ast.module, ident }) : '';

  let result = '';

  result += scriptModule + ident.lineEnd;
  result += scriptInstance + ident.lineEnd;
  result += markup;

  return result;
}
