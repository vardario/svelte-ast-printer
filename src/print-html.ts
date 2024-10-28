import { generate } from 'astring';
import *  as _ from 'lodash';
import { walk } from 'estree-walker';
import { AST } from 'svelte/compiler';
import { DefaultPrinterIdentOptions, PrinterIdentOptions } from './index.js';
import { Node } from 'estree';
export type Write = (text: string) => void;

type ElementLike =
  | AST.Component
  | AST.TitleElement
  | AST.SlotElement
  | AST.RegularElement
  | AST.SvelteBody
  | AST.SvelteComponent
  | AST.SvelteDocument
  | AST.SvelteElement
  | AST.SvelteFragment
  | AST.SvelteHead
  | AST.SvelteOptionsRaw
  | AST.SvelteSelf
  | AST.SvelteWindow;

type Directive =
  | AST.AnimateDirective
  | AST.BindDirective
  | AST.ClassDirective
  | AST.LetDirective
  | AST.OnDirective
  | AST.StyleDirective
  | AST.TransitionDirective
  | AST.UseDirective;

type Tag = AST.ExpressionTag | AST.HtmlTag | AST.ConstTag | AST.DebugTag | AST.RenderTag;
type Block = AST.EachBlock | AST.IfBlock | AST.AwaitBlock | AST.KeyBlock | AST.SnippetBlock;

type TemplateNode =
  | AST.Root
  | AST.Text
  | Tag
  | ElementLike
  | AST.Attribute
  | AST.SpreadAttribute
  | Directive
  | AST.Comment
  | Block;

type SvelteNode = Node | TemplateNode | AST.Fragment | any;

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
  /* eslint-disable unused-imports/no-unused-imports-ts */
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
  enter(_: SvelteNode, __: SvelteNode, ___: PrinterContext) {}
  leave(_: SvelteNode, __: SvelteNode, ___: PrinterContext) {}
}

class ExpressionTagPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.ExpressionTag, __: SvelteNode, context: PrinterContext) {
    const { write } = context;
    write(`{${generate(node.expression, context.indent)}}`);

    context._this.replace({
      ...node,
      expression: undefined
    });
  }
  leave(_: SvelteNode, __: SvelteNode, ___: PrinterContext) {}
}

class ElementPrinter extends BaseHtmlNodePrinter {
  private printAttributes(attribute: AST.Attribute | AST.SpreadAttribute | Directive, context: PrinterContext) {
    const { write } = context;

    if (attribute.type === 'Attribute') {
      if (attribute.value === true) {
        return;
      }

      if (_.isArray(attribute.value)) {
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
        if (_.isArray(attribute.value)) {
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

  enter(node: ElementLike, _: SvelteNode, context: PrinterContext) {
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

  leave(_: SvelteNode, __: SvelteNode, ___: PrinterContext) {}
}

class NoOpPrinter extends BaseHtmlNodePrinter {
  enter(node: SvelteNode, parent: SvelteNode, context: PrinterContext) {
    context._this.skip();
  }
  leave(_: SvelteNode, __: SvelteNode, ___: PrinterContext) {}
}

class CommentPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.Comment, __: SvelteNode, context: PrinterContext) {
    const { write } = context;

    const comment = _.trim(node.data);

    if (comment !== '') {
      write(`<!-- ${comment} -->`);
      write(context.indent.lineEnd);
    }
  }
  leave(_: SvelteNode, __: SvelteNode, ___: PrinterContext) {}
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
  enter(node: AST.EachBlock, parent: SvelteNode, context: PrinterContext) {
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
  leave(node: SvelteNode, parent: SvelteNode, context: PrinterContext) {
    const { write } = context;
    write('{/each}');
  }
}

class AwaitBlockPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.AwaitBlock, parent: SvelteNode, context: PrinterContext) {
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
  leave(node: SvelteNode, parent: SvelteNode, context: PrinterContext) {
    const { write } = context;
    write(`{/await}`);
  }
}

class KeyBlockPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.KeyBlock, parent: SvelteNode, context: PrinterContext) {
    const { write } = context;
    write(`{#key ${generate(node.expression, context.indent)}}`);

    context._this.replace({
      ...node,
      expression: undefined
    });
  }
  leave(node: SvelteNode, parent: SvelteNode, context: PrinterContext) {
    const { write } = context;
    write('{/key}');
  }
}

class HtmlTagPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.HtmlTag, parent: SvelteNode, context: PrinterContext) {
    const { write } = context;
    write(`{@html ${generate(node.expression, context.indent)}}`);
    context._this.replace({
      ...node,
      expression: undefined
    });
  }
  leave(_: SvelteNode, __: SvelteNode, ___: PrinterContext) {}
}

class DebugTagPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.DebugTag, parent: SvelteNode, context: PrinterContext) {
    const { write } = context;
    write(`{@debug ${node.identifiers.map(id => generate(id, context.indent)).join(', ')}}`);

    context._this.replace({
      ...node,
      identifiers: undefined
    });
  }
  leave(_: SvelteNode, __: SvelteNode, ___: PrinterContext) {}
}

class ConstTagPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.ConstTag, parent: SvelteNode, context: PrinterContext) {
    const { write } = context;
    write(`{@const${generate(node.declaration, context.indent).replace(/;|const/g, '')}}`);
    context._this.replace({
      ...node,
      declaration: undefined
    });
  }
  leave(_: SvelteNode, __: SvelteNode, ___: PrinterContext) {}
}

class SnippetBlockPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.SnippetBlock, parent: SvelteNode, context: PrinterContext) {
    const { write } = context;

    write(
      `{#snippet ${generate(node.expression, context.indent)}(${node.parameters
        .map(param => generate(param, context.indent))
        .join(', ')})}`
    );

    context._this.replace({
      ...node,
      expression: undefined,
      parameters: undefined
    });
  }
  leave(node: AST.SnippetBlock, parent: SvelteNode, context: PrinterContext) {
    const { write } = context;
    write(`{/snippet}`);
  }
}

class RenderTagPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.RenderTag, parent: SvelteNode, context: PrinterContext) {
    const { write } = context;

    write(`{@render ${generate(node.expression, context.indent)}}`);

    context._this.replace({
      ...node,
      expression: undefined
    });
  }
  leave(_: SvelteNode, __: SvelteNode, ___: PrinterContext) {}
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
  ConstTag: new ConstTagPrinter(),
  SnippetBlock: new SnippetBlockPrinter(),
  RenderTag: new RenderTagPrinter()
};

/**
 *
 * @returns A copy of the internal used printers
 */
export function getPrinters(): PrinterCollection {
  return _.cloneDeep(PRINTERS);
}

function _printHtml(root: SvelteNode, context: Omit<PrinterContext, '_this'>) {
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
    },
    leave: function (node: SvelteNode, parent: SvelteNode) {
      if (node.skip === true) {
        return;
      }

      const printer = PRINTERS[node.type];
      printer.leave(node, parent, { ...context, _this: this });
    }
  });
}

export default function printHtml(root: AST.Root, indent: PrinterIdentOptions = DefaultPrinterIdentOptions) {
  let result = '';

  const write = (text: string) => {
    result += text;
  };

  const fragment = _.cloneDeep(root.fragment);
  _printHtml(fragment, { indent, write });
  return _.trim(result);
}
