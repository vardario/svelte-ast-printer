import { generate } from 'astring';
import { Script } from 'svelte/types/compiler/interfaces';
import { DefaultPrinterIdentOptions, PrinterIdentOptions } from './index.js';

export interface PrintScriptParams {
  script: Script;
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
