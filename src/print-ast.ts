import type { AST } from 'svelte/src/compiler/types/template.js';
import { DefaultPrinterIdentOptions, PrinterIdentOptions, printHtml, printScript } from './index.js';

export default function printAst(root: AST.Root, indent: PrinterIdentOptions = DefaultPrinterIdentOptions): string {
  const markup = printHtml(root, indent);
  const script = printScript(root, indent);

  return script + indent.lineEnd + markup;
}
