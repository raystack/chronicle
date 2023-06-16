import type { Meta, StoryObj } from '@storybook/react';
import { OpenApi } from './';

// @ts-ignore
import dataJson from '../../testData/sample-schema.json?raw'
// @ts-ignore
import dataYaml from '../../testData/sample-schema.yaml?raw'

const meta : Meta<typeof OpenApi> = {
  title: 'OpenApi',
  component: OpenApi,
} 

export default meta;
type Story = StoryObj<typeof meta>;

export const JSON_FILE_TYPE: Story = {
  args: {
    schema: dataJson
  }
};

export const Yaml: Story = {
  args: {
    schema: dataYaml,
    fileType: "yaml"
  }
};