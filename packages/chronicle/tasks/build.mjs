import swc from "@swc/core";
import { globby } from "globby";
import fs from 'node:fs/promises'

import path from 'node:path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

async function transform(filePath) {
    const content = await fs.readFile(filePath, 'utf-8')
    swc
        .transform(content, {
            sourceMaps: true,
            isModule: true,
            jsc: {
                parser: {
                    syntax: "typescript",
                    tsx: true
                },
                transform: {},
            },
        })
        .then(async (output) => {
            const parsedFileName = path.parse(filePath.replace('src', ''))
            const outputFileName = parsedFileName.name + '.js'
            const sourceMapFileName = parsedFileName.name + '.map.js'

            const outputDest = path.join(__dirname, '..', 'dist', parsedFileName.dir)
            const outputFileDest = path.join(outputDest, outputFileName)
            const outputSourceMapDest = path.join(outputDest, sourceMapFileName)

            await fs.mkdir(outputDest, { recursive: true })
            Promise.all([
                fs.writeFile(outputFileDest, output.code),
                fs.writeFile(outputSourceMapDest, output.map)
            ])
        });
}

async function main() {
    const filePaths = await globby("src/client/**/*.(ts|tsx)");
    filePaths.forEach(transform)
}

main();
