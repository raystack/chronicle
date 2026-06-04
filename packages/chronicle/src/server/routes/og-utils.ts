import fs from 'node:fs/promises';
import path from 'node:path';

export function getLogoDataUri(data: Buffer, filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${data.toString('base64')}`;
}

export async function loadLogo(projectRoot: string, logoPath: string): Promise<string | null> {
  try {
    const filePath = path.resolve(projectRoot, 'public', logoPath.replace(/^\//, ''));
    const data = await fs.readFile(filePath);
    return getLogoDataUri(data, filePath);
  } catch {
    return null;
  }
}

export async function loadFont(packageRoot: string): Promise<ArrayBuffer> {
  try {
    const fontPath = path.resolve(packageRoot, 'src/fonts/Inter-Regular.ttf');
    const buffer = await fs.readFile(fontPath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  } catch {
    return new ArrayBuffer(0);
  }
}
