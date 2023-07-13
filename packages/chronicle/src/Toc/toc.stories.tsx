import type { Meta, StoryObj } from "@storybook/react";
import * as Toc from "./";

const meta: Meta<typeof Toc.Root> = {
    title: "Toc",
    component: Toc.Root,
};

export default meta;
type Story = StoryObj<typeof meta>;

const items = [
    {
        label: "Introduction",
        href: "#intro",
    },
    {
        label: "Introduction 2",
        href: "#intro2",
    },
    {
        label: "Level 1-1",
        href: "#level1",
        level: 1,
    },
    {
        label: "Level 1-2",
        href: "#level1-2",
        level: 2,
    },
    {
        label: "level 2-2",
        href: "#level2-2",
        level: 2,
    },
    {
        label: "level 2-1",
        href: "#level2-1",
        level: 1,
    },
];

export const Primary: Story = {
    args: {
        items,
        active: "#level1",
    },
};
