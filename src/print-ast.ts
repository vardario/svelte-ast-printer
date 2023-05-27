import { Ast } from 'svelte/types/compiler/interfaces';
import { DefaultPrinterIdentOptions, PrinterIdentOptions, printHtml, printScript } from '.';

export interface PrintAstParams {
  ast: Ast;
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
