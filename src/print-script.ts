import { generate } from 'astring';
import type { AST } from 'svelte/src/compiler/types/index.js';
import { DefaultPrinterIdentOptions, PrinterIdentOptions } from './index.js';

export default function printScript(root: AST.Root, indent: PrinterIdentOptions = DefaultPrinterIdentOptions): string {
  let result = '';

  if (root.instance) {
    result += '<script';
    if (root.instance.context !== 'default') {
      result += ` context="${root.instance.context}"`;
    }
    result += '>';
    result += generate(root.instance.content, indent);
    result += '</script>';
  }

  if (root.module) {
    result += '<script context="module">';
    result += generate(root.module.content, indent);
    result += '</script>';
  }

  return result;
}
