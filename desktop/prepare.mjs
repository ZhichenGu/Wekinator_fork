import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const stage = path.join(here, 'stage');
const {version} = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
await mkdir(path.join(stage, 'server'), {recursive: true});
execFileSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build',
  '--mode', 'desktop', '--outDir', path.join(stage, 'dist'), '--emptyOutDir'], {cwd: root, stdio: 'inherit'});
for (const file of ['app.mjs', 'object-api.mjs', 'audio-api.mjs', 'xfyun.mjs']) {
  await cp(path.join(root, 'server', file), path.join(stage, 'server', file));
}
await cp(path.join(here, 'main.mjs'), path.join(stage, 'main.mjs'));
await writeFile(path.join(stage, 'package.json'), JSON.stringify({
  name: 'platform-desktop', productName: 'Platform', version, main: 'main.mjs', type: 'module',
  description: 'Motion, vision and audio for interactive projects', author: 'Zhichen Gu'
}, null, 2));
