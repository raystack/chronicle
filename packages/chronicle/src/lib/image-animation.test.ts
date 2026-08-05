import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { isAnimatedImage } from './image-animation';

let dir: string;
let animatedGif: string;
let stillGif: string;
let stillPng: string;

async function solidPng(color: string): Promise<Buffer> {
  return sharp({ create: { width: 8, height: 8, channels: 3, background: color } }).png().toBuffer();
}

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'chronicle-anim-'));
  animatedGif = path.join(dir, 'tour.gif');
  stillGif = path.join(dir, 'still.gif');
  stillPng = path.join(dir, 'photo.png');

  const frames = await Promise.all([solidPng('#f00'), solidPng('#00f'), solidPng('#0f0')]);
  await fs.writeFile(animatedGif, await sharp(frames, { join: { animated: true } }).gif().toBuffer());
  await fs.writeFile(stillGif, await sharp(frames[0]).gif().toBuffer());
  await fs.writeFile(stillPng, frames[0]);
});

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe('isAnimatedImage', () => {
  test('returns true for a multi-frame gif', async () => {
    expect(await isAnimatedImage(animatedGif)).toBe(true);
  });

  test('returns false for a single-frame gif', async () => {
    expect(await isAnimatedImage(stillGif)).toBe(false);
  });

  test('returns false for formats that cannot animate', async () => {
    expect(await isAnimatedImage(stillPng)).toBe(false);
  });

  test('returns false for a missing file', async () => {
    expect(await isAnimatedImage(path.join(dir, 'nope.gif'))).toBe(false);
  });
});
