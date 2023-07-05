import type { Meta, StoryObj } from "@storybook/react";
import { OpenApi } from "./";

// @ts-expect-error : sample data for import.
import dataYamlv3 from "../../testData/sample-schema_v3.yaml?raw";

const meta: Meta<typeof OpenApi> = {
    title: "OpenApi",
    component: OpenApi,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Yaml_v3: Story = {
    args: {
        schema: dataYamlv3,
        fileType: "yaml",
    },
};
