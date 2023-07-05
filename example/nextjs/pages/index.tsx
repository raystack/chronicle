import { OpenApi, utils } from "@raystack/chronicle";
import { readApiYaml } from "../utils/index";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const getStaticProps = async () => {
    const file = await readApiYaml();
    const schema = await utils.parseSchema(file, "yaml");
    return { props: { schema } };
};

export default function Home({ schema }: { schema: any }) {
    return (
        <main className={`flex min-h-screen flex-col items-center justify-between p-24 ${inter.className}`}>
            <OpenApi schema={schema} />
        </main>
    );
}
