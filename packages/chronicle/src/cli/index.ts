import { Command } from 'commander';
import { buildCommand } from './commands/build';
import { devCommand } from './commands/dev';
import { initCommand } from './commands/init';
import { serveCommand } from './commands/serve';
import { startCommand } from './commands/start';

const program = new Command();

program
  .name('chronicle')
  .description('Config-driven documentation framework')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(devCommand);
program.addCommand(buildCommand);
program.addCommand(startCommand);
program.addCommand(serveCommand);

program.parse();
