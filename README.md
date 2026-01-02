# Next DevTools Kit

A specialized toolkit for Next.js projects to audit code structure, generate AI contexts, and track architectural changes.

## Features

- **Context Builder**: Generate optimized contexts for AI LLMs (ChatGPT, Gemini, Claude) to prevent hallucinations.
- **Project Audit**: Compare snapshots of your codebase (AST-based) to visualize changes in functions, variables, and logic over time.
- **Deep Search**: Search your entire codebase efficiently.

## Installation

1. Clone this repository into your project or use it as a template.
2. Install dependencies:
   ```bash
   npm install

   - ajouter dans globals.css

   @source "../../node_modules/next-devtools-kit/app/**/*.{ts,tsx}";

   - ajouter dans tsconfig.json dans paths 

   "next-devtools-kit/*": ["./node_modules/next-devtools-kit/*"]

   - ajouter dans tailwind.config.ts dans content (pas sur que le fichier est necessaire)

   "./node_modules/next-devtools-kit/app/**/*.{js,ts,jsx,tsx}", 

   ajouter dans package.json le script 

   "audit": "node node_modules/next-devtools-kit/scripts/analyze_structure.js"