import { checkFileExists, readConfig, resolveChronicleConfig } from "../lib/config";
import { DocFile, FileContent, SiteConfig } from "../types";
import path from "node:path";
import fs from "node:fs/promises";
import matter from "gray-matter";

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
        config.docsSources = await Promise.all(
            config.docsSources.map((source) => resolveChronicleConfig(source, config)),
        );
        return new Chronicle({ config });
    }

    async list() {
        const dir = this.config.docsDir || "docs";
        return getFilesPath(dir, [".md", ".yaml"]);
    }

    async listRepos() {
        return this.config.docsSources;
    }

    async read(slug: string[]): Promise<FileContent> {
        const filePath = this.getFilePathFromSlug(slug);
        const isMdFileExists = await checkFileExists(filePath + ".md");
        if (isMdFileExists) {
            return this.readMd(slug);
        }

        const isYamlFileExists = await checkFileExists(filePath + ".yaml");
        if (isYamlFileExists) {
            return this.readOpenApi(slug);
        }

        throw new Error("Unsupported file type");
    }

    async readMd(slug: string[]): Promise<FileContent> {
        const filePath = this.getFilePathFromSlug(slug);
        const fileContent = await fs.readFile(filePath + ".md", "utf-8");
        const { content, data } = matter(fileContent);
        return {
            title: data.title,
            content: content,
            type: "md",
        };
    }

    async readOpenApi(slug: string[]): Promise<FileContent> {
        const filePath = this.getFilePathFromSlug(slug);
        const content = await fs.readFile(filePath + ".yaml", "utf-8");
        return {
            title: "API",
            content: content,
            type: "openapi",
        };
    }

    getFilePathFromSlug(slug: string[]) {
        return path.join(process.cwd(), this.config.docsDir || "docs", ...slug);
    }
}
