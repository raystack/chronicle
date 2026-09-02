# Chronicle

Config-driven documentation framework built on Vite, Nitro, and Apsara UI.

## Features

- **Config-driven** — Single `chronicle.yaml` for all site configuration
- **Themeable** — Built-in themes: `default` (sidebar + TOC), `paper` (book-style) and `fanfold` (continuous-form line printer)
- **MDX** — Write docs in MDX with callouts, tabs, mermaid diagrams, and syntax highlighting
- **API docs** — Interactive OpenAPI documentation with "Try it out" panel
- **LLMs** — Auto-generate `/llms.txt` and `/llms-full.txt` for AI consumption
- **CLI** — `init`, `dev`, `build`, `start`, `serve` commands

## Quick Start

### Install

```bash
npm install -g @raystack/chronicle
```

### Initialize

```bash
chronicle init
```

Creates a `chronicle.yaml` and sample `index.mdx`.

### Develop

```bash
chronicle dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for production

```bash
chronicle build
chronicle start
```

## Contributing

We welcome contributions! Here's how to get started:

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [Bun](https://bun.sh/) >= 1.3

### Running Locally

1. Fork and clone the repository

```bash
git clone https://github.com/<your-username>/chronicle.git
cd chronicle
```

2. Install dependencies

```bash
bun install
```

3. Build the CLI

```bash
bun run build:cli
```

4. Run the docs site locally

```bash
bun run dev:docs
```

Open [http://localhost:3000](http://localhost:3000) to see the docs site.

You can also run the CLI directly:

```bash
./packages/chronicle/bin/chronicle.js dev --config docs/chronicle.yaml
```

### Making Changes

1. Create a branch from `main`
2. Make your changes
3. Test locally from the `docs/` directory
4. Open a pull request

## License

[Apache-2.0](LICENSE)
