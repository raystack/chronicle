export interface RepoSourceConfig {
    org: string;
    name: string;
    tag: string;
    docPath: string;
    config: DocConfig;
}

export interface RepoSourceConfigWithPath extends Omit<RepoSourceConfig, "config"> {
    config: DocConfig | string;
}

export interface DocConfig {
    indexPage: string;
    navigation: [];
    sidebar: [];
}

export interface SiteConfig {
    siteUrl: string;
    title: string;
    imagesDir: string;
    tempDir?: string;
    docsDir?: string;
    docsSources: RepoSourceConfigWithPath[];
}

export type DocFileType = "openapi" | "md";

export interface DocFile {
    slug: Array<string>;
    type: DocFileType;
}

export interface FileContent {
    title: string;
    type: DocFileType;
    content: string;
}
