import { build } from 'esbuild';

/** Read the same selected pack as the runtime, without regex-parsing TypeScript declarations. */
export async function loadContent() {
  const result = await build({
    stdin: { contents: "export * from './src/content'; export * from './src/shared/palettes';", resolveDir: process.cwd() },
    bundle: true, platform: 'node', format: 'esm', write: false,
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
