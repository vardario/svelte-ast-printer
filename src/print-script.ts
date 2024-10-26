import { generate } from 'astring';
import type { AST } from 'svelte/src/compiler/types/index.js';
import { DefaultPrinterIdentOptions, PrinterIdentOptions } from './index.js';

export interface PrintScriptParams {
  script: AST.Script;
  ident?: PrinterIdentOptions;
}

export default function printScript(params: PrintScriptParams) {
  let result = '<script';

  const { script } = params;
  const ident = {
    ...DefaultPrinterIdentOptions,
    ...params.ident
  };

  if (script.context !== 'default') {
    result += ` context="${script.context}"`;
  }

  result += '>';
  result += generate(script.content, ident);
  result += '</script>';

  return result;
}
