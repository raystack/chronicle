import type { StorybookConfig } from "@storybook/react-vite";
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {
      
    },
  },
  docs: {
    autodocs: "tag",
  },
  viteFinal: (config) => {
    const plugins = config.plugins || []
    config.plugins = [...plugins,  nodePolyfills()]
    return config
  }
};
export default config;
