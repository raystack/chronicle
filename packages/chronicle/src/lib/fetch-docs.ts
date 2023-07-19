import simpleGit from "simple-git";
import fs from "fs/promises";
import path from "path";
import { DocRepoConfig, SiteConfig } from "../types";

export async function fetchDoc(config: SiteConfig) {
    const { docsSources, tempDir = ".temp", docsDir = "docs" } = config;
    await Promise.all([removeDir(tempDir), removeDir(docsDir)]);
    await Promise.all(
        docsSources.map(async (repo) => {
            await cloneRepo(repo, tempDir);
            await createDocDir(repo, docsDir);
            return copyToDocs(repo, tempDir, docsDir);
        }),
    );
    await removeDir(tempDir);
}

async function cloneRepo(repo: DocRepoConfig, tempDir: string) {
    const git = simpleGit({});
    const repoPath = `https://github.com/${repo.org}/${repo.name}.git`;

    const cloneOptions = {
        "--branch": repo.tag,
        "--sparse": null,
        "--filter": "blob:none",
    };
    const localPath = path.join(tempDir, repo.name);
    await git.clone(repoPath, localPath, cloneOptions);
    await git.cwd(localPath).raw("sparse-checkout", "set", repo.docPath);
}

async function removeDir(path: string) {
    return fs.rm(path, { recursive: true, force: true });
}

async function createDocDir(repo: DocRepoConfig, docsDir: string) {
    const docDirPath = path.join(docsDir, repo.name);
    return fs.mkdir(docDirPath, { recursive: true });
}

async function copyToDocs(repo: DocRepoConfig, tempDir: string, docsDir: string) {
    const docsSource = path.join(tempDir, repo.name, repo.docPath);
    const docsDest = path.join(docsDir, repo.name);
    await fs.cp(docsSource, docsDest, { recursive: true });
}
