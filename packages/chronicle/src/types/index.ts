export interface DocRepoConfig {
    org: string;
    name: string;
    tag: string;
    docPath: string;
}

export interface SiteConfig {
    siteUrl: string;
    title: string;
    imagesDir: string;
    tempDir?: string;
    docsDir?: string;
    docsSources: DocRepoConfig[];
}
