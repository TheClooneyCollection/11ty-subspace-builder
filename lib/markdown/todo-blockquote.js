export const markTodoBlockquotes = (tokens = [], isProductionBuild = false) => {
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token || token.type !== 'blockquote_open') continue;

    let text = '';
    let j = i + 1;
    for (; j < tokens.length; j += 1) {
      const next = tokens[j];
      if (!next) continue;
      if (next.type === 'blockquote_close') break;
      if (next.type === 'inline' && typeof next.content === 'string') {
        text += `${next.content} `;
      }
    }

    if (/\bTODO\b/i.test(text)) {
      token.attrSet(
        'class',
        isProductionBuild ? 'todo-quote prod' : 'todo-quote',
      );
    }

    if (j > i) i = j;
  }
};
