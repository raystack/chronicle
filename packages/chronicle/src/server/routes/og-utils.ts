import fs from 'node:fs/promises';
import path from 'node:path';

const MIME_MAP: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

export function getLogoDataUri(data: Buffer, filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_MAP[ext];
  if (!mime) return null;
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
  const fontPath = path.resolve(packageRoot, 'src/fonts/Inter-Regular.ttf');
  const buffer = await fs.readFile(fontPath);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}
