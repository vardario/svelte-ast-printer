import { generate } from 'astring';
import _ from 'lodash';
import { walk } from 'estree-walker';
import type { TemplateNode, AST, SvelteNode } from 'svelte/src/compiler/types/template.js';
import type {
  BaseElement,
  LegacyAttribute,
  LegacyComment,
  LegacyMustacheTag,
  LegacySpread,
  LegacySvelteNode
} from 'svelte/src/compiler/types/legacy-nodes.js';

import { DefaultPrinterIdentOptions, PrinterIdentOptions } from './index.js';
export type Write = (text: string) => void;

export interface PrinterContext {
  _this: any;
  write: Write;
  indent: PrinterIdentOptions;
}

export abstract class BaseHtmlNodePrinter {
  constructor() {}

  abstract enter(
    node: SvelteNode | LegacySvelteNode,
    parent: SvelteNode | LegacySvelteNode,
    context: PrinterContext
  ): void;
  abstract leave(
    node: SvelteNode | LegacySvelteNode,
    parent: SvelteNode | LegacySvelteNode,
    context: PrinterContext
  ): void;
}

class FragmentPrinter extends BaseHtmlNodePrinter {
  enter(_: any, __: any, ___: PrinterContext) {}
  leave(_: any, __: any, ___: PrinterContext) {}
}

class ElementPrinter extends BaseHtmlNodePrinter {
  attributeValueToString(attribute: LegacyAttribute | LegacySpread, context: PrinterContext) {
    if (attribute.type === 'Attribute' && attribute.value !== true) {
      const [value] = attribute.value;

      if (value.type === 'Text') {
        return `"${value.data}"`;
      }

      if (['MustacheTag', 'AttributeShorthand'].includes(value.type)) {
        return `{${generate(value.expression, context.indent)}}`;
      }
    }

    if (attribute.type === 'Spread' && attribute.expression) {
      return `{${generate(attribute.expression, context.indent)}}`;
    }

    return '';
  }

  private printAttributes(elementNode: BaseElement, context: PrinterContext) {
    const { write } = context;

    const attributes =
      elementNode.attributes
        ?.map(attribute => {
          let attributeName = '';

          switch (attribute.type) {
            case 'EventHandler':
              attributeName = 'on:';
              break;
            case 'Binding':
              attributeName = 'bind:';
              break;
            case 'Class':
              attributeName = 'class:';
              break;
            case 'StyleDirective':
              attributeName = 'style:';
              break;
            case 'Action':
              attributeName = 'use:';
              break;
            case 'Transition':
              if (attribute.intro === attribute.outro) {
                attributeName = 'transition:';
              } else if (attribute.intro && !attribute.outro) {
                attributeName = 'in:';
              } else if (!attribute.intro && attribute.outro) {
                attributeName = 'out:';
              }
              break;

            case 'Animation':
              attributeName = 'animate:';
              break;

            case 'Let':
              attributeName = 'let:';
              break;
          }

          if (attribute.type === 'Attribute') {
            if (attribute.value === true) {
              return attribute.name;
            }

            const [value] = attribute.value;
            attributeName += attribute.name;

            if (value.type === 'AttributeShorthand') {
              return this.attributeValueToString(attribute, context);
            }
            return `${attributeName}=${this.attributeValueToString(attribute, context)}`;
          }

          if (attribute.type === 'Spread') {
            return `{...${generate(attribute.expression, context.indent)}}`;
          }

          if (attribute.type === 'EventHandler') {
            if (attribute.expression) {
              return `on:${attribute.name}={${generate(attribute.expression, context.indent)}}`;
            }

            return `${attribute.name}`;
          }

          if (attribute.type === 'Binding') {
            return `bind:${attribute.name}={${generate(attribute.expression, context.indent)}}`;
          }

          if (attribute.type === 'Class') {
            return `class:${attribute.name}={${generate(attribute.expression, context.indent)}}`;
          }

          if (attribute.type === 'StyleDirective') {
            if (attribute.value === true) {
              return `style:${attribute.name}`;
            }

            const [value] = attribute.value;

            if (value.type === 'Text') {
              return `style:${attribute.name}="${value.data}"`;
            }

            if (value.type === 'ExpressionTag') {
              return `style:${attribute.name}={${generate(value.expression, context.indent)}}`;
            }

            if (value.type === 'MustacheTag') {
              return `style:${attribute.name}={${generate(value.expression, context.indent)}}`;
            }
          }
        })
        .join(' ') ?? '';

    write(attributes !== '' ? ` ${attributes}` : '');
  }

  enter(node: BaseElement, _: any, context: PrinterContext) {
    const { write } = context;
    if (node.children && node.children.length > 0) {
      write(context.indent.indent);
      write(`<${node.name}`);
      this.printAttributes(node, context);
      write('>');
    } else {
      write(`<${node.name}`);
      this.printAttributes(node, context);
      write('/>');
    }

    context._this.replace({
      ...node,
      attributes: undefined,
      tag: undefined,
      expression: undefined
    });

    write(context.indent.lineEnd);
  }
  leave(node: BaseElement, _: any, context: PrinterContext) {
    const { write } = context;

    if (node.children && node.children.length > 0) {
      write(`</${node.name}>`);
      write(context.indent.lineEnd);
    }
  }
}

class TextPrinter extends BaseHtmlNodePrinter {
  enter(node: AST.Text, _: any, context: PrinterContext) {
    const { write } = context;
    write(node.data);
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
  enter(node: LegacyComment, __: any, context: PrinterContext) {
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
  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;

    if (!node.elseif) {
      write(`{#if ${generate(node.expression, context.indent)}}`);
    } else {
      write(` if ${generate(node.expression, context.indent)}}`);
    }

    write(context.indent.lineEnd);

    context._this.replace({
      ...node,
      expression: undefined
    });
  }
  leave(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    if (!node.elseif) {
      write('{/if}');
    }

    write(context.indent.lineEnd);
  }
}

class ElseBlockPrinter extends BaseHtmlNodePrinter {
  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
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
  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
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
  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write(`{#await ${generate(node.expression, context.indent)}${node.pending.skip === false ? '}' : ''}`);
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
  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    if (parent.pending.skip === true) {
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
  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    if (parent.pending.skip === true) {
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
  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write(`{#key ${generate(node.expression, context.indent)}}`);
  }
  leave(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write('{/key}');
  }
}

class RawMustacheTagPrinter extends BaseHtmlNodePrinter {
  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
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
  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write(`{@debug ${node.identifiers.map((id: any) => generate(id, context.indent)).join(', ')}}`);
  }
  leave(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
}

class ConstTagPrinter extends BaseHtmlNodePrinter {
  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;
    write(`{@const ${generate(node.expression, context.indent)}}`);
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
  Element: new ElementPrinter(),
  InlineComponent: new ElementPrinter(),
  Text: new TextPrinter(),
  MustacheTag: new MustacheTagPrinter(),
  Comment: new CommentPrinter(),
  Slot: new ElementPrinter(),
  // SlotTemplate: new ElementPrinter(),
  // Title: new ElementPrinter(),
  // Slot: new ElementPrinter(),
  // Head: new ElementPrinter(),
  // Options: new ElementPrinter(),
  // Window: new ElementPrinter(),
  // Document: new ElementPrinter(),
  // Body: new ElementPrinter(),
  // Text: new TextPrinter(),
  Attribute: NoOp,
  EventHandler: NoOp,
  Identifier: NoOp,
  Binding: NoOp,
  Class: NoOp,
  StyleDirective: NoOp,
  Action: NoOp,
  Transition: NoOp,
  Animation: NoOp
  // Comment: new CommentPrinter(),
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
  rootNode: SvelteNode | LegacySvelteNode;
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

  let nestingLevel = 0;

  const copy = _.cloneDeep(params.rootNode);

  walk(copy, {
    enter: function (node: SvelteNode | LegacySvelteNode, parent: SvelteNode | LegacySvelteNode) {
      if (node.skip === true) {
        return;
      }
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
    leave: function (node: any, parent: any) {
      if (node.skip === true) {
        return;
      }
      const printer = printers[node.type];
      printer.leave(node, parent, {
        _this: this,
        write,
        indent
      });
      nestingLevel--;
    }
  });

  return _.trim(result);
}
