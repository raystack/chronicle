import { Command } from 'commander'
import { spawn } from 'child_process'
import chalk from 'chalk'

export const buildCommand = new Command('build')
  .description('Build for production')
  .action(() => {
    console.log(chalk.cyan('Building for production...'))
    spawn('npx', ['next', 'build'], {
      stdio: 'inherit',
      shell: true,
    })
  })
