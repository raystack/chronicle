import { OpenApi, Sidebar, utils } from "@raystack/chronicle";
import { readApiYaml } from "../utils/index";
import { Inter } from "next/font/google";
import { SidebarConfig, readSidebarConfig } from "@/utils/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const getStaticProps = async () => {
    const file = await readApiYaml();
    const sidebarConfig = await readSidebarConfig();
    const schema = await utils.parseSchema(file, "yaml");
    return { props: { schema, sidebarConfig } };
};

export default function Home({ schema, sidebarConfig }: { schema: any; sidebarConfig: SidebarConfig }) {
    return (
        <div className="flex">
            <div className="h-screen border-white border-r fixed">
                <Sidebar.Root items={sidebarConfig.items} />
            </div>
            <main className={`p-24 ${inter.className} ml-[280px] w-[calc(100vw_-_280px)]`}>
                <OpenApi.Root schema={schema} />
            </main>
        </div>
    );
}
