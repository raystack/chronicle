import { Navbar } from "@raystack/chronicle/client";
import { readApiYaml } from "../utils/index";
import { Inter } from "next/font/google";
import { SidebarConfig, readSidebarConfig } from "@/utils/sidebar";
import Link from "next/link";
import { OpenAPIV3 } from "openapi-types";

const inter = Inter({ subsets: ["latin"] });

export default function Home({ schema, sidebarConfig }: { schema: OpenAPIV3.Document; sidebarConfig: SidebarConfig }) {
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
                    <Link href={"/docs"} key="docs">
                        Docs
                    </Link>,
                    <Link href={"#"} key="blogs">
                        Blogs
                    </Link>,
                ]}
            />
            <div className="mt-[48px]">
                <h2>Chronicle</h2>
            </div>
        </div>
    );
}
