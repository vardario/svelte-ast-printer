import { generate } from 'astring';
import type { AST } from 'svelte/compiler';
import { DefaultPrinterIdentOptions, PrinterIdentOptions } from './index.js';
import generator from '@vardario/astring-ts-generator';
import { attributeToString } from './utils.js';

export default function printScript(root: AST.Root, indent: PrinterIdentOptions = DefaultPrinterIdentOptions): string {
  let result = '';

  if (root.instance) {
    result += '<script';
    result += root.instance.attributes.map(attributeToString).join(' ');
    result += '>';
    result += generate(root.instance.content, { ...indent, generator });
    result += '</script>';
  }

  if (root.module) {
    result += '<script';
    result += root.module.attributes.map(attributeToString).join(' ');
    result += '>';

    result += generate(root.module.content, { ...indent, generator });
    result += '</script>';
  }

  return result;
}
