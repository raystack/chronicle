import type { Meta, StoryObj } from "@storybook/react";
import * as Sidebar from "./";

const meta: Meta<typeof Sidebar.Root> = {
    title: "Sidebar",
    component: Sidebar.Root,
};

export default meta;
type Story = StoryObj<typeof meta>;

const items = [
    {
        label: "Intro",
        href: "/",
    },
    {
        label: "Getting started",
        items: [
            {
                label: "Intro 2",
                href: "/2",
            },
            {
                label: "Install",
                href: "/install",
            },
        ],
    },
    {
        label: "Help",
        items: [
            {
                label: "Help 1",
                href: "/help1",
            },
            {
                label: "Help 2",
                href: "/help2",
            },
            {
                label: "Help 3",
                items: [
                    {
                        label: "Help 1",
                        href: "/help1",
                    },
                    {
                        label: "Help 2",
                        href: "/help2",
                    },
                ],
            },
        ],
    },
];

export const Primary: Story = {
    args: {
        items,
    },
};
