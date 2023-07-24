import { readConfig } from "../lib/config";
import { DocFile, SiteConfig } from "../types";
import path from "node:path";
import fs from "node:fs/promises";

async function getFilesPath(dir: string, exts: string[] = []): Promise<Array<DocFile>> {
    const files = await fs.readdir(dir);
    return files.reduce(async (acc, file) => {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        const fileExt = path.extname(file);
        if (stats.isDirectory()) {
            const dirFiles = await getFilesPath(filePath, exts);
            return acc.then((prev) => [...prev, ...dirFiles]);
        } else if (exts.includes(fileExt)) {
            const type = fileExt === ".md" ? "md" : "openapi";
            return acc.then((prev) => [...prev, { type, slug: filePath.split(path.sep) }]);
        } else {
            return acc;
        }
    }, Promise.resolve([]) as Promise<Array<DocFile>>);
}

export default class Chronicle {
    config: SiteConfig;
    configFilePath?: string;
    constructor({ config }: { config: SiteConfig }) {
        this.config = config;
    }

    static async initialize({ configPath }: { configPath?: string }) {
        const configFullPath = configPath || path.join(process.cwd(), "config.json");
        const config = await readConfig(configFullPath);
        return new Chronicle({ config });
    }

    async list() {
        const dir = this.config.docsDir || "docs";
        return getFilesPath(dir, [".md", ".yaml"]);
    }
}
