import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import { buildCodeFrame, parseMdxError } from '@/lib/mdx-error';

/**
 * Prints a formatted report for MDX build failures (file, line:column,
 * message, code frame). Returns false when the error is not MDX-related
 * so the caller can rethrow it.
 */
export async function printMdxBuildError(err: unknown, packageRoot: string): Promise<boolean> {
  const info = parseMdxError(err);
  if (!info) return false;

  const contentMirror = path.resolve(packageRoot, '.content');
  const displayPath = info.file?.startsWith(contentMirror)
    ? path.relative(contentMirror, info.file)
    : info.file && !path.relative(process.cwd(), info.file).startsWith('..')
      ? path.relative(process.cwd(), info.file)
      : info.file;

  console.error();
  console.error(chalk.bgRed.white(' MDX Error '), chalk.red(info.message));
  if (displayPath) {
    const position = info.line ? `:${info.line}${info.column ? `:${info.column}` : ''}` : '';
    console.error(chalk.dim(`  ${displayPath}${position}`));
  }

  if (info.file && info.line) {
    try {
      const source = await fs.readFile(info.file, 'utf-8');
      const frame = buildCodeFrame(source, info.line, info.column);
      const gutter = String(frame.lines[frame.lines.length - 1]?.number ?? 0).length;
      console.error();
      for (const { number, text, target } of frame.lines) {
        const ln = `${target ? '>' : ' '} ${String(number).padStart(gutter)} | `;
        console.error(target ? chalk.red(ln) + text : chalk.dim(ln + text));
        if (target && frame.caretColumn) {
          console.error(chalk.red(`  ${' '.repeat(gutter)} | ${' '.repeat(frame.caretColumn - 1)}^`));
        }
      }
    } catch {
      // source not readable — message-only report
    }
  }
  console.error();
  return true;
}
