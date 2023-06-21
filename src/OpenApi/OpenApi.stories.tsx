import type { Meta, StoryObj } from "@storybook/react";
import { OpenApi } from "./";

// @ts-expect-error : sample data for import.
import dataJson from "../../testData/sample-schema.json?raw";
// @ts-expect-error : sample data for import.
import dataYaml from "../../testData/sample-schema.yaml?raw";
// @ts-expect-error : sample data for import.
import dataYamlv3 from "../../testData/sample-schema_v3.yaml?raw";

const meta: Meta<typeof OpenApi> = {
    title: "OpenApi",
    component: OpenApi,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const JSON_FILE_TYPE: Story = {
    args: {
        schema: dataJson,
    },
};

export const Yaml: Story = {
    args: {
        schema: dataYaml,
        fileType: "yaml",
    },
};

export const Yaml_v3: Story = {
    args: {
        schema: dataYamlv3,
        fileType: "yaml",
    },
};
