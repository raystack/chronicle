import { SiteConfig } from "../types";
import fs from "node:fs/promises";

export async function readConfig(path: string): Promise<SiteConfig> {
    const isFileExists = await checkFileExists(path);
    if (!isFileExists) {
        throw new Error("config file doest exist");
    }
    const content = await fs.readFile(path, "utf-8");
    return parseConfigFile(content);
}

async function parseConfigFile(content: string): Promise<SiteConfig> {
    try {
        const config = (await JSON.parse(content)) as SiteConfig;
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
