import { Command } from 'commander'
import { initCommand } from './commands/init'

const program = new Command()

program
  .name('chronicle')
  .description('Config-driven documentation framework')
  .version('0.1.0')

program.addCommand(initCommand)

// Commands will be added in next phases:
// - dev
// - build
// - start
// - preview

program.parse()
