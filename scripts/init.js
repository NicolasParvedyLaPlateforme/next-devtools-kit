#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log("🚀 Initialisation de Next DevTools Kit...");

// 1. Détection de la racine du projet utilisateur (là où la commande est lancée)
const userRoot = process.cwd();

// 2. Détection du dossier 'app' (supporte src/app ou app/)
const hasSrc = fs.existsSync(path.join(userRoot, 'src'));
const appPath = hasSrc ? path.join(userRoot, 'src', 'app') : path.join(userRoot, 'app');

if (!fs.existsSync(appPath)) {
    console.error("❌ Impossible de trouver le dossier 'app' (ni dans root ni dans src).");
    process.exit(1);
}

console.log(`📂 Dossier App détecté : ${hasSrc ? 'src/app' : 'app/'}`);

// 3. Définition des fichiers à créer
const filesToCreate = [
    // --- API ROUTES ---
    {
        path: 'api/devtools/context/route.ts',
        content: `export { GET, POST } from 'next-devtools-kit/app/api/devtools/context/route';`
    },
    {
        path: 'api/devtools/analyze/route.ts',
        content: `export { POST } from 'next-devtools-kit/app/api/devtools/analyze/route';`
    },
    {
        path: 'api/devtools/versions/route.ts',
        content: `export { GET, DELETE } from 'next-devtools-kit/app/api/devtools/versions/route';`
    },
    // --- UI PAGES ---
    {
        path: 'devtools/context/page.tsx',
        content: `export { default } from 'next-devtools-kit/app/devtools/context/page';`
    },
    {
        path: 'devtools/versions/page.tsx',
        content: `export { default } from 'next-devtools-kit/app/devtools/versions/page';`
    }
];

// 4. Boucle de création
filesToCreate.forEach(file => {
    const fullPath = path.join(appPath, file.path);
    const dirName = path.dirname(fullPath);

    // Créer les dossiers récursivement si inexistants
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
    }

    // Écrire le fichier (seulement s'il n'existe pas pour ne pas écraser)
    if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, file.content);
        console.log(`✅ Créé : ${file.path}`);
    } else {
        console.log(`⚠️  Existant (ignoré) : ${file.path}`);
    }
});

// 5. Rappel pour le next.config.ts
console.log("\n🎉 Installation terminée !");
console.log("⚠️  N'oublie pas d'ajouter ceci dans ton next.config.ts (ou .js) :");
console.log(`
const nextConfig = {
  transpilePackages: ['next-devtools-kit'],
};
`);