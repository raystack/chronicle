import type { Meta, StoryObj } from "@storybook/react";
import * as OpenApi from "./";
import { parseSchema } from "../utils";
import React from "react";

// @ts-expect-error : sample data for import.
import dataYamlv3 from "../../testData/sample-schema_v3.yaml?raw";

const meta: Meta<typeof OpenApi.Root> = {
    title: "OpenApi",
    component: OpenApi.Root,
    render: (args, { loaded: { schema } }) => <OpenApi.Root schema={schema} />,
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
