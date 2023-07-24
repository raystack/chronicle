import Chronicle from "@raystack/chronicle/node";
import { Navbar } from "@raystack/chronicle/client";
import { RepoSourceConfig } from "@raystack/chronicle/types";
import Link from "next/link";

function getRepoIndexLink(repo: RepoSourceConfig) {
    const [fileName, ext] = repo.config.indexPage.split(".");
    return `/docs/${repo.name}/${fileName}`;
}

export const getStaticProps = async () => {
    const chronicle = await Chronicle.initialize({});
    const repos = await chronicle.listRepos();
    return { props: { repos } };
};

interface DocsListPageProps {
    repos: RepoSourceConfig[];
}

export default function DocsListPage({ repos }: DocsListPageProps) {
    return (
        <div className="flex flex-col">
            <Navbar.Root logo="Chronicle" className="fixed w-screen bg-black border-b border-white" />
            <main className={`p-24`}>
                {repos.map((repo) => (
                    <Link key={repo.name} href={getRepoIndexLink(repo)}>
                        {repo.name}
                    </Link>
                ))}
            </main>
        </div>
    );
}
