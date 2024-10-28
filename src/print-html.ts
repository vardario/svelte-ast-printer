import { generate } from 'astring';
import _, { isArray } from 'lodash';
import { walk } from 'estree-walker';
import type { TemplateNode, AST, SvelteNode, Directive, ElementLike } from 'svelte/src/compiler/types/template.js';
import { DefaultPrinterIdentOptions, PrinterIdentOptions } from './index.js';
export type Write = (text: string) => void;

const HTML_VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);

export interface PrinterContext {
  _this: any;
  write: Write;
  indent: PrinterIdentOptions;
}

export abstract class BaseHtmlNodePrinter {
  constructor() {}

  abstract enter(node: SvelteNode, parent: SvelteNode, context: PrinterContext): void;
  abstract leave(node: SvelteNode, parent: SvelteNode, context: PrinterContext): void;
}

class FragmentPrinter extends BaseHtmlNodePrinter {
  enter(_: any, __: any, ___: PrinterContext) {}
  leave(_: any, __: any, ___: PrinterContext) {}
}

class ExpressionTagPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.ExpressionTag, __: any, context: PrinterContext) {
    const { write } = context;
    write(`{${generate(node.expression, context.indent)}}`);

    context._this.replace({
      ...node,
      expression: undefined
    });
  }
  leave(_: any, __: any, ___: PrinterContext) {}
}

class ElementPrinter extends BaseHtmlNodePrinter {
  private printAttributes(attribute: AST.Attribute | AST.SpreadAttribute | Directive, context: PrinterContext) {
    const { write } = context;

    if (attribute.type === 'Attribute') {
      if (attribute.value === true) {
        return;
      }

      if (isArray(attribute.value)) {
        const [value] = attribute.value;

        if (value.type === 'Text') {
          write(` ${attribute.name}="${value.data}"`);
        }

        if (value.type === 'ExpressionTag') {
          write(` ${attribute.name}={${generate(value.expression, context.indent)}}`);
        }
      } else {
        write(` ${attribute.name}={${generate(attribute.value.expression, context.indent)}}`);
      }
    } else if (attribute.type === 'SpreadAttribute') {
      write(` {...${generate(attribute.expression, context.indent)}}`);
    } else if (attribute.type === 'AnimateDirective') {
      if (attribute.expression) {
        write(` animate:${attribute.name}={${generate(attribute.expression, context.indent)}}`);
      } else {
        write(` animate:${attribute.name}`);
      }
    } else if (attribute.type === 'BindDirective') {
      write(` bind:${attribute.name}={${generate(attribute.expression, context.indent)}}`);
    } else if (attribute.type === 'ClassDirective') {
      write(` class:${attribute.name}={${generate(attribute.expression, context.indent)}}`);
    } else if (attribute.type === 'LetDirective') {
      if (attribute.expression) {
        write(` let:${attribute.name}={${generate(attribute.expression, context.indent)}}`);
      } else {
        write(` let:${attribute.name}`);
      }
    } else if (attribute.type === 'OnDirective') {
      if (attribute.expression) {
        write(` on:${attribute.name}={${generate(attribute.expression, context.indent)}}`);
      } else {
        write(` on:${attribute.name}`);
      }
    } else if (attribute.type === 'StyleDirective') {
      if (attribute.value === true) {
        write(` style:${attribute.name}`);
      } else {
        if (isArray(attribute.value)) {
          const [value] = attribute.value;
          if (value.type === 'Text') {
            write(` style:${attribute.name}="${value.data}"`);
          } else {
            write(` style:${attribute.name}={${generate(value, context.indent)}}`);
          }
        } else {
          write(` style:${attribute.name}={${generate(attribute.value.expression, context.indent)}}`);
        }
      }
    } else if (attribute.type === 'TransitionDirective') {
      const transition = () => {
        if (attribute.intro && !attribute.outro) {
          return 'in';
        }

        if (attribute.outro && !attribute.intro) {
          return 'out';
        }

        return 'transition';
      };

      if (attribute.expression) {
        write(` ${transition()}:${attribute.name}={${generate(attribute.expression, context.indent)}}`);
      } else {
        write(` ${transition()}:${attribute.name}`);
      }
    } else if (attribute.type === 'UseDirective') {
      if (attribute.expression) {
        write(` use:${attribute.name}={${generate(attribute.expression, context.indent)}}`);
      } else {
        write(` use:${attribute.name}`);
      }
    }
  }

  enter(node: ElementLike, _: any, context: PrinterContext) {
    const { write } = context;

    write(`<${node.name}`);

    if (node.type === 'SvelteElement' && node.tag) {
      write(` this={${generate(node.tag)}}`);

      context._this.replace({
        ...node,
        tag: undefined
      });
    }

    if (node.type === 'SvelteComponent' && node.expression) {
      write(` this={${generate(node.expression)}}`);

      context._this.replace({
        ...node,
        expression: undefined
      });
    }

    node.attributes.forEach(attribute => this.printAttributes(attribute, context));

    if (
      (node.type === 'Component' ||
        node.type === 'SlotElement' ||
        node.type === 'SvelteSelf' ||
        node.type === 'SvelteWindow' ||
        node.type === 'SvelteDocument' ||
        node.type === 'SvelteBody' ||
        node.type === 'SvelteHead' ||
        node.type === 'SvelteElement' ||
        node.type === 'SvelteComponent' ||
        node.type === 'SvelteFragment') &&
      node.fragment.nodes.length === 0
    ) {
      write('/>');
    } else {
      write('>');
    }
    write(context.indent.lineEnd);
  }
  leave(node: ElementLike, parent: SvelteNode, context: PrinterContext) {
    const { write } = context;

    if (!HTML_VOID_ELEMENTS.has(node.name)) {
      if (
        (node.type === 'Component' ||
          node.type === 'SlotElement' ||
          node.type === 'SvelteSelf' ||
          node.type === 'SvelteWindow' ||
          node.type === 'SvelteDocument' ||
          node.type === 'SvelteBody' ||
          node.type === 'SvelteHead' ||
          node.type === 'SvelteElement' ||
          node.type === 'SvelteComponent' ||
          node.type === 'SvelteFragment') &&
        node.fragment.nodes.length === 0
      ) {
        return;
      }

      write(`</${node.name}>`);
    }
  }
}

class TextPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.Text, parent: SvelteNode, context: PrinterContext) {
    const { write } = context;

    if (parent.type === 'Attribute') {
      write(`"${node.data}"`);
    } else {
      write(node.data);
    }
  }

  leave(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
}

class NoOpPrinter extends BaseHtmlNodePrinter {
  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    context._this.skip();
  }
  leave(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
}

class CommentPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.Comment, __: any, context: PrinterContext) {
    const { write } = context;

    const comment = _.trim(node.data);

    if (comment !== '') {
      write(`<!-- ${comment} -->`);
      write(context.indent.lineEnd);
    }
  }
  leave(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
}

class IfBlockPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.IfBlock, __: SvelteNode, context: PrinterContext) {
    const { write } = context;

    if (node.elseif) {
      write(`{:else if ${generate(node.test, context.indent)}}`);
      _printHtml(node.consequent, context);
      write(context.indent.lineEnd);
    } else {
      write(`{#if ${generate(node.test, context.indent)}}`);
      write(context.indent.lineEnd);
      _printHtml(node.consequent, context);
    }

    if (node.alternate) {
      const hasElseIf = node.alternate.nodes.some(node => node.type === 'IfBlock');
      if (!hasElseIf) {
        write('{:else}');
      }
      write(context.indent.lineEnd);
      _printHtml(node.alternate, context);
    }

    context._this.replace({
      ...node,
      consequent: undefined,
      alternate: undefined,
      test: undefined
    });
  }
  leave(node: AST.IfBlock, __: SvelteNode, context: PrinterContext) {
    const { write } = context;
    if (!node.elseif) {
      write('{/if}');
      write(context.indent.lineEnd);
    }
  }
}

class EachBlockPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.EachBlock, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;

    write(`{#each ${generate(node.expression, context.indent)}`);

    if (node.context) {
      write(` as ${generate(node.context, context.indent)}`);
    }

    if (node.index) {
      write(`, ${node.index}`);
    }

    if (node.key) {
      write(` (${generate(node.key, context.indent)})`);
    }

    write('}');

    context._this.replace({
      ...node,
      expression: undefined,
      context: undefined,
      key: undefined
    });
  }
  leave(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write('{/each}');
  }
}

class AwaitBlockPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.AwaitBlock, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write(`{#await ${generate(node.expression, context.indent)}}`);

    if (node.pending) {
      _printHtml(node.pending, context);
    }

    if (node.then) {
      if (node.value) {
        write(`{:then ${generate(node.value, context.indent)}}`);
      } else {
        write('{:then}');
      }

      _printHtml(node.then, context);
    }

    if (node.catch) {
      if (node.error) {
        write(`{:catch ${generate(node.error, context.indent)}}`);
      } else {
        write('{:catch}');
      }

      _printHtml(node.catch, context);
    }

    context._this.replace({
      ...node,
      expression: undefined,
      pending: undefined,
      then: undefined,
      catch: undefined,
      value: undefined,
      error: undefined
    });
  }
  leave(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write(`{/await}`);
  }
}

class KeyBlockPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.KeyBlock, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write(`{#key ${generate(node.expression, context.indent)}}`);

    context._this.replace({
      ...node,
      expression: undefined
    });
  }
  leave(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write('{/key}');
  }
}

class HtmlTagPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.HtmlTag, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write(`{@html ${generate(node.expression, context.indent)}}`);
    context._this.replace({
      ...node,
      expression: undefined
    });
  }
  leave(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
}

class DebugTagPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.DebugTag, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write(`{@debug ${node.identifiers.map((id: any) => generate(id, context.indent)).join(', ')}}`);

    context._this.replace({
      ...node,
      identifiers: undefined
    });
  }
  leave(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
}

class ConstTagPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.ConstTag, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write(`{@const${generate(node.declaration, context.indent).replace(/;|const/g, '')}}`);
    context._this.replace({
      ...node,
      declaration: undefined
    });
  }
  leave(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
}

const NoOp = new NoOpPrinter();

export type PrinterCollection = Record<string, BaseHtmlNodePrinter>;

const PRINTERS: PrinterCollection = {
  Fragment: new FragmentPrinter(),
  RegularElement: new ElementPrinter(),
  Component: new ElementPrinter(),
  Text: new TextPrinter(),
  ExpressionTag: new ExpressionTagPrinter(),
  Comment: new CommentPrinter(),
  SlotElement: new ElementPrinter(),
  SvelteSelf: new ElementPrinter(),
  SvelteWindow: new ElementPrinter(),
  SvelteDocument: new ElementPrinter(),
  SvelteBody: new ElementPrinter(),
  SvelteHead: new ElementPrinter(),
  SvelteElement: new ElementPrinter(),
  SvelteComponent: new ElementPrinter(),
  SvelteFragment: new ElementPrinter(),
  Attribute: NoOp,
  SpreadAttribute: NoOp,
  OnDirective: NoOp,
  BindDirective: NoOp,
  ClassDirective: NoOp,
  StyleDirective: NoOp,
  UseDirective: NoOp,
  TransitionDirective: NoOp,
  AnimateDirective: NoOp,
  LetDirective: NoOp,
  BinaryExpression: NoOp,
  IfBlock: new IfBlockPrinter(),
  EachBlock: new EachBlockPrinter(),
  AwaitBlock: new AwaitBlockPrinter(),
  KeyBlock: new KeyBlockPrinter(),
  HtmlTag: new HtmlTagPrinter(),
  DebugTag: new DebugTagPrinter(),
  ConstTag: new ConstTagPrinter()
};

/**
 *
 * @returns A copy of the internal used printers
 */
export function getPrinters(): PrinterCollection {
  return _.cloneDeep(PRINTERS);
}

export interface PrintHtmlParams {
  rootNode: AST.Root;
  ident?: PrinterIdentOptions;
  printers?: PrinterCollection;
}

function _printHtml(root: SvelteNode, context: Omit<PrinterContext, '_this'>) {
  let nestingLevel = 0;

  walk(root, {
    enter: function (node: SvelteNode, parent: SvelteNode) {
      if (node.skip === true) {
        return;
      }

      const printer = PRINTERS[node.type];
      if (printer === undefined) {
        throw new Error(`Could not find printer for ${node.type}`);
      }

      printer.enter(node, parent, { ...context, _this: this });

      nestingLevel++;
    },
    leave: function (node: SvelteNode, parent: SvelteNode) {
      nestingLevel--;

      if (node.skip === true) {
        return;
      }

      const printer = PRINTERS[node.type];
      printer.leave(node, parent, { ...context, _this: this });
    }
  });
}

export default function printHtml(params: PrintHtmlParams) {
  let result = '';

  const write = (text: string) => {
    result += text;
  };

  const indent = {
    ...DefaultPrinterIdentOptions,
    ...params.ident
  };

  const fragment = _.cloneDeep(params.rootNode.fragment);
  _printHtml(fragment, { indent, write });
  return _.trim(result);
}
