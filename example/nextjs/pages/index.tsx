import { OpenApi, Sidebar, Navbar, Toc, utils } from "@raystack/chronicle/client";
import { readApiYaml } from "../utils/index";
import { Inter } from "next/font/google";
import { SidebarConfig, readSidebarConfig } from "@/utils/sidebar";
import Link from "next/link";
import { OpenAPIV3 } from "openapi-types";

const inter = Inter({ subsets: ["latin"] });

export const getStaticProps = async () => {
    const file = await readApiYaml();
    const sidebarConfig = await readSidebarConfig();
    const schema = await utils.parseSchema(file, "yaml");
    return { props: { schema, sidebarConfig } };
};

export default function Home({ schema, sidebarConfig }: { schema: OpenAPIV3.Document; sidebarConfig: SidebarConfig }) {
    const headingsLink = utils.getApiPaths(schema).map((path) => ({
        label: path.data.summary || path.data.description || "",
        href: "#" + path.key,
    }));
    return (
        <div className="flex flex-col">
            <Navbar.Root
                logo="Chronicle"
                className="fixed w-screen bg-black border-b border-white"
                leftActionItems={[
                    <Link href={"#"} key="products">
                        Products
                    </Link>,
                    <Link href={"#"} key="solutions">
                        Solutions
                    </Link>,
                ]}
                rightActionItems={[
                    <Link href={"#"} key="docs">
                        Docs
                    </Link>,
                    <Link href={"#"} key="blogs">
                        Blogs
                    </Link>,
                ]}
            />
            <div className="mt-[48px]">
                <Sidebar.Root items={sidebarConfig.items} className="h-screen border-white border-r fixed" />
                <main className={`p-24 ${inter.className} mx-[280px] w-[calc(100vw_-_560px)]`}>
                    <OpenApi.Root schema={schema} />
                </main>
                <aside className="h-screen border-white border-l fixed right-0 top-[48px] p-4">
                    <Toc.Root items={headingsLink} className="w-[240px]" />
                </aside>
            </div>
        </div>
    );
}
