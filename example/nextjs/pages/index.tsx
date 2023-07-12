import { OpenApi, Sidebar, utils, Navbar } from "@raystack/chronicle";
import { readApiYaml } from "../utils/index";
import { Inter } from "next/font/google";
import { SidebarConfig, readSidebarConfig } from "@/utils/sidebar";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const getStaticProps = async () => {
    const file = await readApiYaml();
    const sidebarConfig = await readSidebarConfig();
    const schema = await utils.parseSchema(file, "yaml");
    return { props: { schema, sidebarConfig } };
};

export default function Home({ schema, sidebarConfig }: { schema: any; sidebarConfig: SidebarConfig }) {
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
                <div className="h-screen border-white border-r fixed">
                    <Sidebar.Root items={sidebarConfig.items} />
                </div>
                <main className={`p-24 ${inter.className} ml-[280px] w-[calc(100vw_-_280px)]`}>
                    <OpenApi.Root schema={schema} />
                </main>
            </div>
        </div>
    );
}
