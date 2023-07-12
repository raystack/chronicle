import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import * as Navbar from "./";
import { SunIcon } from "@radix-ui/react-icons";

const meta: Meta<typeof Navbar.Root> = {
    title: "Navbar",
    component: Navbar.Root,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const TextLogo: Story = {
    args: {
        logo: "Chronicle",
        leftActionItems: [
            <a href="/#" key="home">
                Home
            </a>,
            <a href="/#" key="products">
                Products
            </a>,
            <a href="/#" key="solutions">
                Solutions
            </a>,
            <Navbar.Menu
                key="menu"
                label="Menu 1"
                items={[
                    <a href="/#" key="docs">
                        Docs
                    </a>,
                    <a href="/#" key="blogs">
                        Blogs
                    </a>,
                    <a href="/#" key="Github">
                        Github
                    </a>,
                ]}
            />,
        ],
        rightActionItems: [
            <a href="/#" key="docs">
                Docs
            </a>,
            <a href="/#" key="blogs">
                Blogs
            </a>,
            <a href="/#" key="Github">
                Github
            </a>,
            <Navbar.Menu
                key="menu"
                label="Menu 2"
                menuPosition="right"
                items={[
                    <a href="/#" key="docs">
                        Docs
                    </a>,
                    <a href="/#" key="blogs">
                        Blogs
                    </a>,
                    <a href="/#" key="Github">
                        Github
                    </a>,
                ]}
            />,
        ],
    },
};

export const ComponentLogo: Story = {
    args: {
        logo: (
            <>
                <SunIcon />
                <span style={{ marginLeft: "8px" }}>Chronicle</span>
            </>
        ),
    },
};
