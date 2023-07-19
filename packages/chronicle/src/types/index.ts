interface DocRepoConfig {
    org: string;
    name: string;
    tag: string;
    docPath: string;
}

export interface SiteConfig {
    siteUrl: string;
    title: string;
    docsSources: DocRepoConfig[];
}
