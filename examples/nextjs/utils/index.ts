import fs from 'node:fs/promises';
import path from 'node:path';

export const readApiYaml = () => {
  return fs.readFile(path.join(process.cwd(), 'docs', 'api.yaml'), 'utf-8')
}