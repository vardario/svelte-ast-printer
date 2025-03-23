import { AST } from 'svelte/compiler';
import { PrinterContext } from './print-html';
import { generate } from 'astring';
import generator from '@vardario/astring-ts-generator';
import _ from 'lodash';
import { Node } from 'estree';

export type ElementLike =
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

export type Directive =
  | AST.AnimateDirective
  | AST.BindDirective
  | AST.ClassDirective
  | AST.LetDirective
  | AST.OnDirective
  | AST.StyleDirective
  | AST.TransitionDirective
  | AST.UseDirective;

export type Tag = AST.ExpressionTag | AST.HtmlTag | AST.ConstTag | AST.DebugTag | AST.RenderTag;
export type Block = AST.EachBlock | AST.IfBlock | AST.AwaitBlock | AST.KeyBlock | AST.SnippetBlock;

export type TemplateNode =
  | AST.Root
  | AST.Text
  | Tag
  | ElementLike
  | AST.Attribute
  | AST.SpreadAttribute
  | Directive
  | AST.Comment
  | Block;

export type SvelteNode = Node | TemplateNode | AST.Fragment | any;

export function identLiteral(level: number, ident: string) {
  return new Array(level).join(ident);
}

export function printAttributes(attribute: AST.Attribute | AST.SpreadAttribute | Directive, context: PrinterContext) {
  const { write } = context;

  const _generate = (node: SvelteNode) => {
    return generate(node, { ...context.indent, generator });
  };

  if (attribute.type === 'Attribute') {
    if (attribute.value === true) {
      write(` ${attribute.name}`);
      return;
    }

    if (_.isArray(attribute.value)) {
      const [value] = attribute.value;

      if (value.type === 'Text') {
        write(` ${attribute.name}="${value.data}"`);
      }

      if (value.type === 'ExpressionTag') {
        write(` ${attribute.name}={${_generate(value.expression)}}`);
      }
    } else {
      write(` ${attribute.name}={${_generate(attribute.value.expression)}}`);
    }
  } else if (attribute.type === 'SpreadAttribute') {
    write(` {...${_generate(attribute.expression)}}`);
  } else if (attribute.type === 'AnimateDirective') {
    if (attribute.expression) {
      write(` animate:${attribute.name}={${_generate(attribute.expression)}}`);
    } else {
      write(` animate:${attribute.name}`);
    }
  } else if (attribute.type === 'BindDirective') {
    write(` bind:${attribute.name}={${_generate(attribute.expression)}}`);
  } else if (attribute.type === 'ClassDirective') {
    write(` class:${attribute.name}={${_generate(attribute.expression)}}`);
  } else if (attribute.type === 'LetDirective') {
    if (attribute.expression) {
      write(` let:${attribute.name}={${_generate(attribute.expression)}}`);
    } else {
      write(` let:${attribute.name}`);
    }
  } else if (attribute.type === 'OnDirective') {
    if (attribute.expression) {
      write(` on:${attribute.name}={${_generate(attribute.expression)}}`);
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
          write(` style:${attribute.name}={${_generate(value)}}`);
        }
      } else {
        write(` style:${attribute.name}={${_generate(attribute.value.expression)}}`);
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
      write(` ${transition()}:${attribute.name}={${_generate(attribute.expression)}}`);
    } else {
      write(` ${transition()}:${attribute.name}`);
    }
  } else if (attribute.type === 'UseDirective') {
    if (attribute.expression) {
      write(` use:${attribute.name}={${_generate(attribute.expression)}}`);
    } else {
      write(` use:${attribute.name}`);
    }
  }
}

export function attributeToString(attribute: AST.Attribute | AST.SpreadAttribute | Directive) {
  let result = '';

  const context: PrinterContext = {
    _this: null,
    write: (str: string) => {
      return (result += str);
    },
    indent: {
      indent: '',
      lineEnd: ''
    }
  };

  printAttributes(attribute, context);

  return result;
}
