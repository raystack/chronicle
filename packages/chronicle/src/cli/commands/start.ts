import { Command } from 'commander'
import { spawn } from 'child_process'
import chalk from 'chalk'

export const startCommand = new Command('start')
  .description('Start production server')
  .option('-p, --port <port>', 'Port number', '3000')
  .action((options) => {
    console.log(chalk.cyan('Starting production server...'))
    spawn('npx', ['next', 'start', '-p', options.port], {
      stdio: 'inherit',
      shell: true,
    })
  })
