# Next DevTools Kit

A specialized toolkit for Next.js projects to audit code structure, generate AI contexts, and track architectural changes.

## 🚀 Features

* **Context Builder**: Generate optimized contexts for AI LLMs (ChatGPT, Gemini, Claude) to prevent hallucinations.
* **Project Audit**: Compare snapshots of your codebase (AST-based) to visualize changes in functions, variables, and logic over time.
* **Deep Search**: Search your entire codebase efficiently.

## 📦 Installation

### 1. Install the package

Install the package directly from the repository (or npm if published).

```bash
# Using Git (Recommended for private use)
npm install "git+https://github.com/NicolasParvedyLaPlateforme/next-devtools-kit" --save-dev

# OR using local path (for development)
npm install "file:../path/to/next-devtools-kit" --save-dev

```

### 2. Initialize Routes (Automated)

Run the initialization command to automatically create the DevTools pages (`/devtools/...`) and API routes in your project.

```bash
npx next-devtools-kit

```

---

## ⚙️ Configuration (Required)

Since this kit runs locally within your Next.js app, you need to configure a few files to allow compilation and styling.

### 1. Next.js Config (`next.config.ts`)

Allow Next.js to compile the TypeScript files from the package.

```typescript
const nextConfig = {
  transpilePackages: ['next-devtools-kit'],
};
export default nextConfig;

```

### 2. TypeScript Config (`tsconfig.json`)

Force TypeScript to look inside the package folder for types. Add this to `compilerOptions.paths`.

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "next-devtools-kit/*": ["./node_modules/next-devtools-kit/*"]
    }
  }
}

```

### 3. Tailwind CSS v4 (`src/app/globals.css`)

Add the `@source` directive at the top of your CSS file to inject the kit's styles.
*(Note: If you are not using `src/`, remove `../` from the path).*

```css
@import "tailwindcss";

/* 👇 Add this line to load DevTools styles */
@source "../../node_modules/next-devtools-kit/app/**/*.{ts,tsx}";

@theme {
  /* ... your theme ... */
}

```

### 4. Scripts (`package.json`)

Add these shortcuts to your project's scripts to run audits easily.

```json
"scripts": {
  "audit": "node node_modules/next-devtools-kit/scripts/analyze_structure.js",
  "audit:watch": "node node_modules/next-devtools-kit/scripts/watch.js"
}

```

---

## 🛠️ Usage

### Start the Tools

Run your development server as usual:

```bash
npm run dev

```

👉 Access the tools at: **`http://localhost:3000/devtools/context`**

### Run an Audit (Snapshot)

To analyze your code structure and save a snapshot:

```bash
npm run audit -- save

```

### Real-time Monitoring

To update the "current" snapshot automatically while you code:

```bash
npm run audit:watch

```

Si besoin => npm i --legacy-peer-deps