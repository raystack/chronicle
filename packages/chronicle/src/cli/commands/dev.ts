import { Command } from 'commander'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import { loadCLIConfig } from '../utils'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '../../..')

export const devCommand = new Command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Port number', '3000')
  .action((options) => {
    const { contentDir } = loadCLIConfig()

    console.log(chalk.cyan('Starting dev server...'))
    console.log(chalk.gray(`Content: ${contentDir}`))

    spawn('npx', ['next', 'dev', '-p', options.port], {
      stdio: 'inherit',
      shell: true,
      cwd: packageRoot,
      env: {
        ...process.env,
        CHRONICLE_CONTENT_DIR: contentDir,
      },
    })
  })
