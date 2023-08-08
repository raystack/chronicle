import fs, { constants } from "node:fs/promises";
import path from "node:path";
import { Sidebar } from "@raystack/chronicle";
import { requireFromString } from "module-from-string";

export interface SidebarConfig {
    items: Sidebar.SidebarItem[];
}

export async function readSidebarConfig(): Promise<SidebarConfig> {
    try {
        const filePath = path.join(process.cwd(), "docs", "chronicle.js");
        await fs.access(filePath, constants.R_OK);
        const fileContent = await fs.readFile(filePath, "utf8");
        const data: SidebarConfig = requireFromString(fileContent);
        return data;
    } catch (err) {
        console.error(err);
        return {
            items: [],
        };
    }
}
