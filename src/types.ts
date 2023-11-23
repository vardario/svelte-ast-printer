/**
 * Ident options to to for printing
 */
export interface PrinterIdentOptions {
  /**
   * @default two spaces
   */
  indent: string;

  /**
   * @default \n
   */
  lineEnd: string;
}

/**
 * Default options for indentation
 */
export const DefaultPrinterIdentOptions: PrinterIdentOptions = {
  indent: '  ',
  lineEnd: '\n'
};
