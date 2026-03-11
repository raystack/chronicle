# Chronicle

Config-driven documentation framework built on Next.js, Fumadocs, and Apsara UI.

## Features

- **Config-driven** — Single `chronicle.yaml` for all site configuration
- **Themeable** — Built-in themes: `default` (sidebar + TOC) and `paper` (book-style)
- **MDX** — Write docs in MDX with callouts, tabs, mermaid diagrams, and syntax highlighting
- **API docs** — Interactive OpenAPI documentation with "Try it out" panel
- **LLMs** — Auto-generate `/llms.txt` and `/llms-full.txt` for AI consumption
- **CLI** — `init`, `dev`, `build`, `start`, `serve` commands

## Quick Start

### Install

```bash
npm install @raystack/chronicle
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
cd packages/chronicle
bun build-cli.ts
```

4. Run the dev server

```bash
bun bin/chronicle.js dev --content ../../docs
```

Open [http://localhost:3000](http://localhost:3000) to see the docs site.

### Making Changes

1. Create a branch from `main`
2. Make your changes
3. Test locally with `bun bin/chronicle.js dev --content ../../docs`
4. Open a pull request

## License

[Apache-2.0](LICENSE)
