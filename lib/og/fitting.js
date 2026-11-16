import satori from 'satori';

const inheritedKeys = [
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'wordBreak',
  'textTransform',
];

// Metadata lives outside props and never reaches Satori's SVG output. Measure a
// paint-free copy: glass gradients/shadows and decorative images need no passes.
export async function fitTree(tree, fonts) {
  const result = structuredClone(tree);
  let title, region, inherited;
  const nodes = new Map();
  function skeleton(node, parentStyle = {}) {
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node))
      return node.map((child) => skeleton(child, parentStyle));
    const style = { ...node.props.style };
    const textStyle = { ...parentStyle };
    for (const key of inheritedKeys)
      if (style[key] !== undefined) textStyle[key] = style[key];
    if (node.ogFit?.role === 'title') {
      title = node;
      inherited = textStyle;
    }
    if (node.ogFit?.role === 'region') region = node;
    const id = nodes.size;
    nodes.set(id, node);
    for (const key of ['background', 'backgroundImage', 'boxShadow', 'color'])
      delete style[key];
    const props = { ...node.props, style, 'data-fit-id': id };
    if (node.ogFit?.role === 'title') {
      props.children = undefined;
      style.height = 0;
      style.minHeight = 0;
      style.flexShrink = 0;
    } else props.children = skeleton(props.children, textStyle);
    if (node.type === 'img') {
      delete props.src;
      return { type: 'div', props };
    }
    return { type: node.type, props };
  }
  const probe = skeleton(result);
  if (!title || !region) return { tree: result, diagnostics: null };
  const bounds = new Map();
  const { width, height } = result.props.style;
  await satori(probe, {
    width,
    height,
    fonts,
    onNodeDetected(node) {
      bounds.set(nodes.get(node.props['data-fit-id']), node);
    },
  });
  const regionBox = bounds.get(region);
  const titleBox = bounds.get(title);
  const siblings = [region.props.children]
    .flat()
    .filter((node) => node && node !== title);
  let available = regionBox.height;
  if (region.ogFit.classic) {
    const footer = [...nodes.values()].find(
      (node) => node.ogFit?.role === 'footer',
    );
    available = bounds.get(footer).top - regionBox.top;
  }
  for (const sibling of siblings) {
    available -=
      (bounds.get(sibling)?.height ?? 0) +
      (parseFloat(sibling.props?.style?.marginBottom) || 0) +
      (parseFloat(sibling.props?.style?.marginTop) || 0);
  }
  available -= title.ogFit.gap + (parseFloat(region.props.style.gap) || 0);
  if (available <= 0) throw new Error('OG title has no available layout space');
  const originalSize = parseFloat(title.props.style.fontSize);
  const tracking =
    (parseFloat(title.props.style.letterSpacing) || 0) / originalSize;
  const originalText = [title.props.children].flat().join('');
  let measured;
  // Yoga reports the constrained element width even if a single word paints
  // outside it. Measure unbreakable runs separately with the same font stack.
  const words =
    originalText.match(
      /[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu,
    ) || [];
  let widestWord = 0;
  if (words.length)
    await satori(
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: 100000,
          },
          children: words.map((word) => ({
            type: 'div',
            props: {
              style: {
                ...inherited,
                fontSize: originalSize,
                whiteSpace: 'nowrap',
              },
              children: word,
            },
          })),
        },
      },
      {
        width: 100000,
        fonts,
        onNodeDetected(node) {
          if (node.textContent) widestWord = Math.max(widestWord, node.width);
        },
      },
    );
  async function measure(text, size, wrap = false) {
    const style = {
      display: 'flex',
      ...inherited,
      ...title.props.style,
      width: titleBox.width,
      fontSize: size,
      letterSpacing: size * tracking,
      ...(wrap ? { wordBreak: 'break-all' } : {}),
      flexShrink: 0,
    };
    await satori(
      { type: 'div', props: { style, children: text } },
      {
        width: titleBox.width,
        fonts,
        onNodeDetected(node) {
          measured = node;
        },
      },
    );
    return (
      measured.height <= available + 0.01 &&
      measured.width <= titleBox.width + 0.01 &&
      (wrap || (widestWord * size) / originalSize <= titleBox.width + 0.01)
    );
  }
  let size = originalSize;
  let text = originalText;
  let fits = await measure(text, size);
  // Preserve the selected tier exactly when it fits, including its tracking.
  if (!fits) {
    while (size > title.ogFit.min && !fits) {
      size = Math.max(title.ogFit.min, size - 2);
      fits = await measure(text, size);
    }
    if (!fits) {
      title.props.style.wordBreak = 'break-all';
      fits = await measure(text, size, true);
    }
    if (!fits) {
      const characters = Array.from(originalText);
      let low = 0,
        high = characters.length;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (
          await measure(
            `${characters.slice(0, middle).join('').trimEnd()}…`,
            size,
            true,
          )
        )
          low = middle;
        else high = middle - 1;
      }
      text = `${characters.slice(0, low).join('').trimEnd()}…`;
      title.props.style.wordBreak = 'break-all';
      if (!(await measure(text, size, true)))
        throw new Error('OG title ellipsis cannot fit');
    }
    title.props.style.fontSize = size;
    title.props.style.letterSpacing = size * tracking;
    title.props.children = text;
  }
  return {
    tree: result,
    diagnostics: {
      fontSize: size,
      text,
      availableHeight: available,
      width: titleBox.width,
      measuredHeight: measured.height,
      measuredWidth: measured.width,
      changed: size !== originalSize || text !== originalText,
    },
  };
}
