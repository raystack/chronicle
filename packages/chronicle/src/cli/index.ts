import { Command } from 'commander'
import { initCommand } from './commands/init'
import { devCommand } from './commands/dev'
import { buildCommand } from './commands/build'
import { startCommand } from './commands/start'
import { serveCommand } from './commands/serve'

const program = new Command()

program
  .name('chronicle')
  .description('Config-driven documentation framework')
  .version('0.1.0')

program.addCommand(initCommand)
program.addCommand(devCommand)
program.addCommand(buildCommand)
program.addCommand(startCommand)
program.addCommand(serveCommand)

program.parse()
