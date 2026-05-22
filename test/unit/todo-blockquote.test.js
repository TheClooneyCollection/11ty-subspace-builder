import { describe, it, expect } from 'vitest';
import { markTodoBlockquotes } from '../../lib/markdown/todo-blockquote.js';

const makeToken = (type, content = '') => {
  const attrs = new Map();
  return {
    type,
    content,
    attrSet(key, value) {
      attrs.set(key, value);
    },
    getAttr(key) {
      return attrs.get(key);
    },
  };
};

const blockquoteTokens = (text) => [
  makeToken('blockquote_open'),
  makeToken('paragraph_open'),
  makeToken('inline', text),
  makeToken('paragraph_close'),
  makeToken('blockquote_close'),
];

describe('markTodoBlockquotes', () => {
  it('tags a blockquote containing TODO with the dev class', () => {
    const tokens = blockquoteTokens('TODO write tests');
    markTodoBlockquotes(tokens, false);
    expect(tokens[0].getAttr('class')).toBe('todo-quote');
  });

  it('tags with the prod class in production builds', () => {
    const tokens = blockquoteTokens('TODO ship it');
    markTodoBlockquotes(tokens, true);
    expect(tokens[0].getAttr('class')).toBe('todo-quote prod');
  });

  it('is case-insensitive on the TODO word', () => {
    const tokens = blockquoteTokens('todo lowercase');
    markTodoBlockquotes(tokens, false);
    expect(tokens[0].getAttr('class')).toBe('todo-quote');
  });

  it('only matches whole words', () => {
    const tokens = blockquoteTokens('todoist app review');
    markTodoBlockquotes(tokens, false);
    expect(tokens[0].getAttr('class')).toBeUndefined();
  });

  it('leaves non-TODO blockquotes untouched', () => {
    const tokens = blockquoteTokens('just a quote');
    markTodoBlockquotes(tokens, false);
    expect(tokens[0].getAttr('class')).toBeUndefined();
  });

  it('handles multiple blockquotes in one pass', () => {
    const tokens = [
      ...blockquoteTokens('TODO one'),
      ...blockquoteTokens('a plain quote'),
      ...blockquoteTokens('Another TODO here'),
    ];
    markTodoBlockquotes(tokens, false);
    expect(tokens[0].getAttr('class')).toBe('todo-quote');
    expect(tokens[5].getAttr('class')).toBeUndefined();
    expect(tokens[10].getAttr('class')).toBe('todo-quote');
  });

  it('tolerates empty input', () => {
    expect(() => markTodoBlockquotes([], false)).not.toThrow();
    expect(() => markTodoBlockquotes()).not.toThrow();
  });
});
