import { generate } from 'astring';
import _, { isArray } from 'lodash';
import { walk } from 'estree-walker';
import type { TemplateNode, AST, SvelteNode, Directive } from 'svelte/src/compiler/types/template.js';
import type {
  LegacyCatchBlock,
  LegacyMustacheTag,
  LegacyPendingBlock,
  LegacyRawMustacheTag,
  LegacyThenBlock
} from 'svelte/src/compiler/types/legacy-nodes.js';

import { DefaultPrinterIdentOptions, PrinterIdentOptions } from './index.js';
import { Expression, Node } from 'estree';
export type Write = (text: string) => void;

declare module 'svelte/src/compiler/types/template.js' {
  namespace AST {
    interface IfBlock {
      expression?: Expression;
    }

    interface ConstTag {
      expression?: Expression;
    }
  }
}

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
          write(` style:${attribute.name}={${generate(attribute.value, context.indent)}}`);
        }
      }
    } else if (attribute.type === 'TransitionDirective') {
      const transition = () => {
        if (attribute.intro) {
          return 'in:';
        }

        if (attribute.outro) {
          return 'out:';
        }

        return 'transition:';
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

  enter(node: AST.RegularElement | AST.Component | AST.SlotElement, _: any, context: PrinterContext) {
    const { write } = context;

    write(`<${node.name}`);
    node.attributes.forEach(attribute => this.printAttributes(attribute, context));

    if ((node.type === 'Component' || node.type === 'SlotElement') && node.fragment.nodes.length === 0) {
      write('/>');
    } else {
      write('>');
    }

    write(context.indent.lineEnd);
  }
  leave(node: AST.RegularElement | AST.Component | AST.SlotElement, parent: SvelteNode, context: PrinterContext) {
    const { write } = context;

    if (!HTML_VOID_ELEMENTS.has(node.name)) {
      if ((node.type === 'Component' || node.type === 'SlotElement') && node.fragment.nodes.length === 0) {
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

class MustacheTagPrinter extends BaseHtmlNodePrinter {
  enter(node: LegacyMustacheTag, _: any, context: PrinterContext) {
    context.write(`{${generate(node.expression, context.indent)}}`);

    context._this.replace({
      ...node,
      expression: undefined
    });
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

    if (!node.elseif) {
      write(`{#if ${generate(node.test || node.expression, context.indent)}}`);
    } else {
      write(` if ${generate(node.test || node.expression, context.indent)}}`);
    }

    write(context.indent.lineEnd);

    context._this.replace({
      ...node,
      expression: undefined
    });
  }
  leave(node: AST.IfBlock, __: SvelteNode, context: PrinterContext) {
    const { write } = context;
    if (!node.elseif) {
      write('{/if}');
    }

    write(context.indent.lineEnd);
  }
}

class ElseBlockPrinter extends BaseHtmlNodePrinter {
  enter(node: any, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;

    const [child] = node.children ?? [];

    if (child?.elseif) {
      write('{:else');
    } else {
      write('{:else}');
    }
  }
  leave(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
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
    write(
      `{#await ${generate(node.expression, context.indent)}${
        (node.pending as unknown as LegacyPendingBlock).skip === false ? '}' : ''
      }`
    );
    context._this.replace({
      ...node,
      expression: undefined
    });
  }
  leave(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write(`{/await}`);
  }
}

class PendingBlockPrinter extends BaseHtmlNodePrinter {
  enter(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
  leave(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
}

class ThenBlockPrinter extends BaseHtmlNodePrinter {
  enter(node: LegacyThenBlock, parent: AST.AwaitBlock, context: PrinterContext) {
    const { write } = context;
    if ((parent.pending as unknown as LegacyPendingBlock).skip === true) {
      write(' then');
    } else {
      write('{:then');
    }

    if (parent.value) {
      write(` ${generate(parent.value, context.indent)}`);
    }
    write('}');
  }
  leave(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
}

class CatchBlockPrinter extends BaseHtmlNodePrinter {
  enter(node: LegacyCatchBlock, parent: AST.AwaitBlock, context: PrinterContext) {
    const { write } = context;
    if ((parent.pending as unknown as LegacyPendingBlock).skip === true) {
      write(' catch');
    } else {
      write('{:catch');
    }

    if (parent.error) {
      write(` ${generate(parent.error, context.indent)}`);
    }
    write('}');
  }
  leave(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
}

class KeyBlockPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.KeyBlock, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write(`{#key ${generate(node.expression, context.indent)}}`);
  }
  leave(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write('{/key}');
  }
}

class RawMustacheTagPrinter extends BaseHtmlNodePrinter {
  enter(node: LegacyRawMustacheTag, parent: TemplateNode, context: PrinterContext) {
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
  }
  leave(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
}

class ConstTagPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.ConstTag, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write(`{@const ${generate(node.expression!, context.indent)}}`);
    context._this.replace({
      ...node,
      expression: undefined
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
  // MustacheTag: new MustacheTagPrinter(),
  Comment: new CommentPrinter(),
  SlotElement: new ElementPrinter(),
  Attribute: NoOp,
  SpreadAttribute: NoOp
  // Slot: new ElementPrinter(),
  // SlotTemplate: new ElementPrinter(),
  // Title: new ElementPrinter(),
  // Head: new ElementPrinter(),
  // Options: new ElementPrinter(),
  // Window: new ElementPrinter(),
  // Document: new ElementPrinter(),
  // Body: new ElementPrinter(),
  // Attribute: NoOp,
  // EventHandler: NoOp,
  // Identifier: NoOp,
  // Binding: NoOp,
  // Class: NoOp,
  // StyleDirective: NoOp,
  // Action: NoOp,
  // Transition: NoOp,
  // Animation: NoOp,
  // IfBlock: new IfBlockPrinter(),
  // ElseBlock: new ElseBlockPrinter(),
  // EachBlock: new EachBlockPrinter(),
  // AwaitBlock: new AwaitBlockPrinter(),
  // PendingBlock: new PendingBlockPrinter(),
  // ThenBlock: new ThenBlockPrinter(),
  // CatchBlock: new CatchBlockPrinter(),
  // KeyBlock: new KeyBlockPrinter(),
  // RawMustacheTag: new RawMustacheTagPrinter(),
  // DebugTag: new DebugTagPrinter(),
  // ConstTag: new ConstTagPrinter()
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

export default function printHtml(params: PrintHtmlParams) {
  const printers = params.printers ?? PRINTERS;
  const indent = {
    ...DefaultPrinterIdentOptions,
    ...params.ident
  };

  let result = '';

  const write = (text: string) => {
    result += text;
  };

  const copy = _.cloneDeep(params.rootNode.fragment);

  let nestingLevel = 0;

  walk(copy as unknown as Node, {
    enter: function (node: SvelteNode, parent: SvelteNode) {
      if (node.skip === true) {
        return;
      }

      console.log(Array(nestingLevel).join(' '), `${node.type} << ${parent?.type}`);

      const printer = printers[node.type];
      if (printer === undefined) {
        throw new Error(`Could not find printer for ${node.type}`);
      }

      printer.enter(node, parent, {
        _this: this,
        write,
        indent
      });

      nestingLevel++;
    },
    leave: function (node: SvelteNode, parent: SvelteNode) {
      nestingLevel--;

      if (node.skip === true) {
        return;
      }

      console.log(Array(nestingLevel).join(' '), `${node.type} << ${parent?.type}`);

      const printer = printers[node.type];
      printer.leave(node, parent, {
        _this: this,
        write,
        indent
      });
    }
  });

  return _.trim(result);
}
