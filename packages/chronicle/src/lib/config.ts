import { RepoSourceConfig, SiteConfig, RepoSourceConfigWithPath } from "../types";
import fs from "node:fs/promises";
import path from "node:path";

export async function readConfig(configPath: string): Promise<SiteConfig> {
    const isFileExists = await checkFileExists(configPath);
    if (!isFileExists) {
        throw new Error("config file doest exist");
    }
    const content = await fs.readFile(configPath, "utf-8");
    return parseConfigFile(content);
}

async function parseConfigFile<T>(content: string): Promise<T> {
    try {
        const config = (await JSON.parse(content)) as T;
        return config;
    } catch (e) {
        throw new Error("unable to parse config file");
    }
}

async function checkFileExists(path: string): Promise<boolean> {
    try {
        await fs.access(path, fs.constants.F_OK);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function resolveChronicleConfig(
    repo: RepoSourceConfigWithPath,
    config?: SiteConfig,
): Promise<RepoSourceConfig> {
    if (typeof repo.config === "object") return repo as RepoSourceConfig;
    else if (typeof repo.config === "string") {
        const { docsDir = "docs" } = config || {};
        const configPath = path.join(process.cwd(), docsDir, repo.name, repo.config);
        const isFileExists = await checkFileExists(configPath);
        if (!isFileExists) {
            throw new Error(`chronicle config file doest exist in path: ${configPath}`);
        }
        const content = await fs.readFile(configPath, "utf-8");
        return parseConfigFile(content);
    } else {
        throw new Error(`unsupported config type`);
    }
}
