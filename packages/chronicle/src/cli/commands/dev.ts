import { Command } from 'commander'
import { spawn } from 'child_process'
import chalk from 'chalk'

export const devCommand = new Command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Port number', '3000')
  .action((options) => {
    console.log(chalk.cyan('Starting dev server...'))
    spawn('npx', ['next', 'dev', '-p', options.port], {
      stdio: 'inherit',
      shell: true,
    })
  })
