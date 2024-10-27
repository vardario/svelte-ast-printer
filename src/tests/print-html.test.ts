import { parse } from 'svelte/compiler';
import { describe, expect, test } from 'vitest';
import printHtml from '../print-html';

function testHtmlPrinter(code: string, expectedResult?: string) {
  const ast = parse(code);
  const result = printHtml({
    rootNode: ast.html,
    ident: {
      indent: '',
      lineEnd: ''
    }
  });
  expect(result).toBe(expectedResult ?? code);
  //double check semantic correctness
  parse(result);
}

describe('Tags', () => {
  test('simple element', () => testHtmlPrinter('<main/>'));
  test('nested element', () => testHtmlPrinter('<main><div/></main>'));
  test('inline component element', () => testHtmlPrinter('<Input/>'));

  test('simple text element', () => testHtmlPrinter('Hello,World!'));
  test('nested text element', () => testHtmlPrinter('<span>Hello,World!</span>'));

  test('Mustache Tag element', () => testHtmlPrinter('<span>{temp}</span>'));

  test('comment', () => testHtmlPrinter('<!-- this is a comment! -->'));
  testHtmlPrinter('<slot><!-- optional fallback --></slot>');

  test('slot', () => {
    testHtmlPrinter('<slot name="x"><!-- optional fallback --></slot>');
    testHtmlPrinter('<slot prop={value}/>');
  });
});

describe('Attributes', () => {
  test('simple attribute element', () => testHtmlPrinter('<main class="flex"/>'));
  test('JS attribute element', () => testHtmlPrinter('<div class={getClass()}/>'));
  test('Shorthand attribute element', () => testHtmlPrinter('<div {name}/>'));
  test('spread attribute element', () => testHtmlPrinter('<input {...rest}/>'));
  test('inline component element with attribute', () => testHtmlPrinter('<Input class="flex"/>'));
});

describe('Element directives', () => {
  test('on:eventname', () => testHtmlPrinter('<input on:change={onChange}/>'));
  test('bind:property', () => testHtmlPrinter('<input bind:value/>', '<input bind:value={value}/>'));
  test('bind:group', () => testHtmlPrinter('<input type="radio" bind:group={tortilla} value="Plain"/>'));

  test('bind:this', () => testHtmlPrinter('<canvas bind:this={canvasElement}/>'));

  test('class:name', () => {
    testHtmlPrinter('<div class:active={active}/>');
    testHtmlPrinter('<div class:active/>', '<div class:active={active}/>');
  });

  test('style:property', () => {
    testHtmlPrinter('<div style:color/>');
    testHtmlPrinter('<div style:color="red"/>');
    testHtmlPrinter('<div style:color style:width="12rem" style:background-color={darkMode ? "black" : "white"}/>');
  });

  test('use:action', () => {
    testHtmlPrinter('<div use:foo={bar}/>');
    testHtmlPrinter('<div use:foo/>');
  });

  test('transition:fn', () => {
    testHtmlPrinter('<div transition:fade/>');
    testHtmlPrinter('<div transition:fade={{duration: 2000}}/>');
  });

  test('in/out:fn', () => {
    testHtmlPrinter('<div in:fly out:fade>flies in, fades out</div>');
    testHtmlPrinter('<div in:fly={{duration: 2000}} out:fade{{duration: 2000}}>flies in, fades out</div>');
  });

  test('animate:fn', () => {
    testHtmlPrinter('<li animate:flip={{delay: 500}}>{item}</li>');
    testHtmlPrinter('<div animate:whizz>{item}</div>');
  });

  test('let:variable', () => {
    testHtmlPrinter('<checkbox let:isChecked/>');
  });
});

describe('Template', () => {
  test('{#if ...}', () => {
    testHtmlPrinter('{#if answer === 42}<p>what was the question?</p>{/if}');
  });

  test('{#if expression}...{:else}...{/if}', () => {
    testHtmlPrinter("{#if answer === 42}<p>what was the question?</p>{:else}<p>We don't know</p>{/if}");
  });

  test('{#if expression}...{:else if}...{/if}', () => {
    testHtmlPrinter(
      "{#if answer === 42}<p>what was the question?</p>{:else if answer === 43}<p>We don't know</p>{/if}"
    );
  });

  test('{#if expression}...{:else}...{/if}', () => {
    testHtmlPrinter("{#if answer === 42}<p>what was the question?</p>{:else}<p>We don't know</p>{/if}");
  });

  test('{#if expression}...{:else if expression}...{/if}', () => {
    testHtmlPrinter('{#if a > 100}<p>a</p>{:else if a > 200}<p>b</p>{:else}<p>c</p>{/if}');
  });

  test('{#if}...{:else if expression}...{:else if expression}...{/if}', () => {
    testHtmlPrinter('{#if a > 100}<p>a</p>{:else if a > 200}<p>b</p>{:else if a > 300}<p>c</p>{/if}');
  });

  test('{#if expression}...{:else if expression}...{:else if expression}...{:else}...{/if}', () => {
    testHtmlPrinter('{#if a > 100}<p>a</p>{:else if a > 200}<p>b</p>{:else if a > 300}<p>c</p>{:else}<p>d</p>{/if}');
  });

  test('{#each}', () => {
    testHtmlPrinter('{#each items as item}<li>{item.name} x {item.qty}</li>{/each}');
    testHtmlPrinter('{#each items as item (item.id)}<li>{item.name} x {item.qty}</li>{/each}');
    testHtmlPrinter('{#each items as item, i (item.id)}<li>{i + 1}: {item.name} x {item.qty}</li>{/each}');
    testHtmlPrinter('{#each items as {id, name, qty}, i (id)}<li>{i + 1}: {name} x {qty}</li>{/each}');
    testHtmlPrinter('{#each objects as {id, ...rest}}<li><span>{id}</span><MyComponent {...rest}/></li>{/each}');
  });

  test('{#await}', () => {
    testHtmlPrinter(
      '{#await promise}<p>waiting for the promise to resolve...</p>{:then value}<p>The value is {value}</p>{:catch error}<p>Something went wrong: {error.message}</p>{/await}'
    );
    testHtmlPrinter(
      '{#await promise}<p>waiting for the promise to resolve...</p>{:then value}<p>The value is {value}</p>{/await}'
    );

    testHtmlPrinter('{#await promise then value}<p>The value is {value}</p>{/await}');
    testHtmlPrinter('{#await promise catch error}<p>The error is {error}</p>{/await}');
    testHtmlPrinter('{#await item.promise then value}<p>{value}</p>{/await}');
  });

  test('{#key ...}', () => {
    testHtmlPrinter('{#key value}<div transition:fade>{value}</div>{/key}');
  });

  test('{@html ...}', () => {
    testHtmlPrinter('{@html post.content}');
  });

  test('{@debug ...}', () => {
    testHtmlPrinter('{@debug var1, var2}');
  });

  test('{@const ...}', () => {
    testHtmlPrinter('{@const area = box.width * box.height}');
  });
});

describe('Svelte Component', () => {
  test('<svelte:self>', () => {
    testHtmlPrinter(
      '{#if count > 0}<p>counting down... {count}</p><svelte:self count={count - 1}/>{:else}<p>lift-off!</p>{/if}'
    );
  });

  test('<svelte:window>', () => {
    testHtmlPrinter('<svelte:window on:event={handler}/>');
  });

  test('<svelte:document>', () => {
    testHtmlPrinter('<svelte:document on:event={handler}/>');
  });

  test('<svelte:body>', () => {
    testHtmlPrinter('<svelte:body on:event={handler}/>');
  });

  test('<svelte:head>', () => {
    testHtmlPrinter('<svelte:head><link rel="stylesheet" href="/tutorial/dark-theme.css"/></svelte:head>');
  });

  test('<svelte:element>', () => {
    testHtmlPrinter('<svelte:element this={tag} on:click={handler}>Foo</svelte:element>');
  });

  test('<svelte:component>', () => {
    testHtmlPrinter('<svelte:component this={currentSelection.component} foo={bar}/>');
  });

  test('<svelte:fragment>', () => {
    testHtmlPrinter(
      '<Widget><h1 slot="header">Hello</h1><svelte:fragment slot="footer"><p>All rights reserved.</p><p>Copyright (c) 2019 Svelte Industries</p></svelte:fragment></Widget>'
    );
  });
});
