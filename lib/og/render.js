import satori from 'satori';
import { fitTree } from './fitting.js';
import { Resvg } from '@resvg/resvg-js';

export async function render(tree, fonts) {
  const { width, height } = tree.props.style;
  const fitted = await fitTree(tree, fonts);
  const svg = await satori(fitted.tree, { width, height, fonts });
  return Buffer.from(
    new Resvg(svg, {
      fitTo: { mode: 'width', value: width },
    })
      .render()
      .asPng(),
  );
}

export default render;
