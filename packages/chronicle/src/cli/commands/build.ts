import { Command } from 'commander'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import { loadCLIConfig } from '../utils'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '../../..')

export const buildCommand = new Command('build')
  .description('Build for production')
  .action(() => {
    const { contentDir } = loadCLIConfig()

    console.log(chalk.cyan('Building for production...'))
    console.log(chalk.gray(`Content: ${contentDir}`))

    spawn('npx', ['next', 'build'], {
      stdio: 'inherit',
      shell: true,
      cwd: packageRoot,
      env: {
        ...process.env,
        CHRONICLE_CONTENT_DIR: contentDir,
      },
    })
  })
