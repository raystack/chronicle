import { Navbar } from "@raystack/chronicle/client";
import Chronicle from "@raystack/chronicle/node";
import { FileContent } from "@raystack/chronicle/types";

interface DocPageProps {
    data: FileContent;
}

export default function DocPage({ data }: DocPageProps) {
    return (
        <div className="flex flex-col">
            <Navbar.Root logo="Chronicle" className="fixed w-screen bg-black border-b border-white" />
            <main className={`p-24`}>
                <div dangerouslySetInnerHTML={{ __html: data.content }} />
            </main>
        </div>
    );
}

function slugifyFilePaths(paths: string[]) {
    paths.shift();
    const fileName = paths.pop() || "";
    const [name] = fileName?.split(".");
    return [...paths, name];
}

export const getStaticPaths = async () => {
    const chronicle = await Chronicle.initialize({});
    const files = await chronicle.list();
    const paths = files.map((doc) => ({
        params: {
            slug: slugifyFilePaths(doc.slug),
        },
    }));
    return {
        paths: paths,
        fallback: false,
    };
};

export const getStaticProps = async ({ params: { slug } }: { params: { slug: string[] } }) => {
    const chronicle = await Chronicle.initialize({});
    const data = await chronicle.read(slug);
    return {
        props: { data },
    };
};
