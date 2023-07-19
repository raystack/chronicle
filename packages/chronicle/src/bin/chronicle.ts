#! /usr/bin/env node

import { Command } from "commander";
import pkg from "../../package.json";
import path from "node:path";
import { readConfig } from "../lib/config";

const program = new Command();

program.name("chronicle").description(pkg.description).version(pkg.version);

program
    .command("fetch")
    .option("-c, --config <path>", "path to config file", "config.json")
    .action(async (options) => {
        const configFilePath = path.join(process.cwd(), options.config);
        const config = await readConfig(configFilePath);
        console.log(config);
    });

program.parse();
