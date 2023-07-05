import type { Meta, StoryObj } from "@storybook/react";
import { OpenApi } from "./";
import { parseSchema } from "../utils";
import React from "react";

// @ts-expect-error : sample data for import.
import dataYamlv3 from "../../testData/sample-schema_v3.yaml?raw";

const meta: Meta<typeof OpenApi> = {
    title: "OpenApi",
    component: OpenApi,
    render: (args, { loaded: { schema } }) => <OpenApi schema={schema} />,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
    loaders: [
        async () => ({
            schema: await parseSchema(dataYamlv3, "yaml"),
        }),
    ],
};
