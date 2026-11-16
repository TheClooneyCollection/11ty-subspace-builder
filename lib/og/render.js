import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

export async function render(tree, fonts) {
  const { width, height } = tree.props.style;
  const svg = await satori(tree, { width, height, fonts });
  return Buffer.from(
    new Resvg(svg, {
      fitTo: { mode: 'width', value: width },
    })
      .render()
      .asPng(),
  );
}

export default render;
