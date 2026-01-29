import { Command } from 'commander'
import chalk from 'chalk'

const program = new Command()

program
  .name('chronicle')
  .description('Config-driven documentation framework')
  .version('0.1.0')

// Commands will be added in next phases:
// - init
// - dev
// - build
// - start
// - preview

program.parse()
