import { generate } from 'astring';
import _ from 'lodash';
import { walk } from 'estree-walker';
import {
  Attribute,
  Comment,
  Element,
  MustacheTag,
  SpreadAttribute,
  TemplateNode,
  Text
} from 'svelte/types/compiler/interfaces';
import { DefaultPrinterIdentOptions, PrinterIdentOptions } from './index.js';

export type Write = (text: string) => void;

export interface PrinterContext {
  _this: any;
  write: Write;
  indent: PrinterIdentOptions;
}

export abstract class BaseHtmlNodePrinter {
  constructor() {}

  abstract enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext): void;
  abstract leave(node: TemplateNode, parent: TemplateNode, context: PrinterContext): void;
}

class FragmentPrinter extends BaseHtmlNodePrinter {
  enter(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
  leave(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
}

class ElementPrinter extends BaseHtmlNodePrinter {
  attributeValueToString(attribute: Attribute | SpreadAttribute, context: PrinterContext) {
    if (attribute.value) {
      const [value] = attribute.value;

      if (value.type === 'Text') {
        return `"${value.data}"`;
      }

      if (['MustacheTag', 'AttributeShorthand'].includes(value.type)) {
        return `{${generate(value.expression, context.indent)}}`;
      }
    }

    if (attribute.expression) {
      return `{${generate(attribute.expression, context.indent)}}`;
    }

    return '';
  }

  private printAttributes(elementNode: Element, context: PrinterContext) {
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

          attributeName += attribute.name;

          let value: any;

          if (_.isArray(attribute.value)) {
            value = attribute.value[0];
          }

          if (_.isBoolean(attribute.value) && attribute.value === true) {
            return attributeName;
          }

          if (value && value.type === 'AttributeShorthand') {
            return this.attributeValueToString(attribute as Attribute, context);
          }

          if (attribute?.expression === null) {
            return attributeName;
          }

          if (attribute.type === 'Spread') {
            return `{...${generate(attribute.expression, context.indent)}}`;
          }

          if (attribute?.expression) {
            return `${attributeName}={${generate(attribute.expression, context.indent)}}`;
          }

          return `${attributeName}=${this.attributeValueToString(attribute as Attribute, context)}`;
        })
        .join(' ') ?? '';

    if (elementNode.expression) {
      write(` this={${generate(elementNode.expression, context.indent)}}`);
    }

    if (elementNode.tag) {
      write(` this={${generate(elementNode.tag, context.indent)}}`);
    }

    write(attributes !== '' ? ` ${attributes}` : '');
  }

  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const elementNode = node as Element;
    const { write } = context;

    if (elementNode.children && elementNode.children.length > 0) {
      write(context.indent.indent);
      write(`<${elementNode.name}`);
      this.printAttributes(elementNode, context);
      write('>');
    } else {
      write(`<${elementNode.name}`);
      this.printAttributes(elementNode, context);
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
  leave(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const element = node as Element;

    const { write } = context;

    if (element.children && element.children.length > 0) {
      write(`</${element.name}>`);
      write(context.indent.lineEnd);
    }
  }
}

class AttributePrinter extends BaseHtmlNodePrinter {
  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    context._this.skip();
  }
  leave(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
}

class TextPrinter extends BaseHtmlNodePrinter {
  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;

    const textNode = node as Text;
    write(textNode.data);
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
  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const mustacheTagNode = node as MustacheTag;
    context.write(`{${generate(mustacheTagNode.expression, context.indent)}}`);

    context._this.replace({
      ...node,
      expression: undefined
    });
  }
  leave(_: TemplateNode, __: TemplateNode, ___: PrinterContext) {}
}

class CommentPrinter extends BaseHtmlNodePrinter {
  enter(node: TemplateNode, parent: TemplateNode, context: PrinterContext) {
    const { write } = context;

    const commentNode = node as Comment;
    const comment = _.trim(commentNode.data);

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
  Element: new ElementPrinter(),
  InlineComponent: new ElementPrinter(),
  SlotTemplate: new ElementPrinter(),
  Title: new ElementPrinter(),
  Slot: new ElementPrinter(),
  Head: new ElementPrinter(),
  Options: new ElementPrinter(),
  Window: new ElementPrinter(),
  Document: new ElementPrinter(),
  Body: new ElementPrinter(),
  MustacheTag: new MustacheTagPrinter(),
  Attribute: new AttributePrinter(),
  Fragment: new FragmentPrinter(),
  Text: new TextPrinter(),
  EventHandler: NoOp,
  Identifier: NoOp,
  Binding: NoOp,
  Class: NoOp,
  StyleDirective: NoOp,
  Action: NoOp,
  Transition: NoOp,
  Animation: NoOp,
  Comment: new CommentPrinter(),
  IfBlock: new IfBlockPrinter(),
  ElseBlock: new ElseBlockPrinter(),
  EachBlock: new EachBlockPrinter(),
  AwaitBlock: new AwaitBlockPrinter(),
  PendingBlock: new PendingBlockPrinter(),
  ThenBlock: new ThenBlockPrinter(),
  CatchBlock: new CatchBlockPrinter(),
  KeyBlock: new KeyBlockPrinter(),
  RawMustacheTag: new RawMustacheTagPrinter(),
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
  rootNode: TemplateNode;
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

  walk(_.cloneDeep(params.rootNode as any), {
    enter: function (node: any, parent: any) {
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
