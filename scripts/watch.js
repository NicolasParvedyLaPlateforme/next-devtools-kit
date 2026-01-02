const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// 1. Détection dynamique du dossier à surveiller (src/app ou app)
const projectRoot = process.cwd();
const hasSrc = fs.existsSync(path.join(projectRoot, 'src', 'app'));
const WATCH_DIR = hasSrc ? 'src/app' : 'app';

// 2. Chemin absolu vers le script d'analyse (dans le même dossier que ce watch.js)
const ANALYZE_SCRIPT = path.join(__dirname, 'analyze_structure.js');

console.log(`👀 Mode Surveillance activé sur le dossier : ${WATCH_DIR}`);
console.log(`📝 Les modifications mettront à jour le snapshot 'current'`);

// 3. Fonction pour lancer l'analyse (avec Debounce)
let timeout = null;

const runAnalysis = () => {
    console.log('🔄 Changement détecté ! Analyse en cours...');
    
    // On exécute le script d'analyse sans argument (ce qui déclenche le mode "current" par défaut)
    // On met des guillemets autour du path au cas où il y ait des espaces
    exec(`node "${ANALYZE_SCRIPT}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Erreur: ${error.message}`);
            return;
        }
        if (stderr) {
            // On filtre les warnings npm inoffensifs si besoin
            console.error(`⚠️ ${stderr}`);
        }
        console.log(`✅ Mise à jour terminée (Dossier 'version_current')`);
    });
};

const triggerUpdate = () => {
    // On attend 500ms après la dernière sauvegarde pour lancer le script
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(runAnalysis, 500);
};

// 4. Initialisation du watcher
// On surveille tout, sauf les fichiers cachés et node_modules
const watcher = chokidar.watch(WATCH_DIR, {
    ignored: /(^|[\/\\])\../, 
    persistent: true,
    ignoreInitial: true // Ne pas relancer tout de suite, on fait un run manuel juste après
});

watcher
  .on('add', path => triggerUpdate())
  .on('change', path => triggerUpdate())
  .on('unlink', path => triggerUpdate());

// On lance une première fois au démarrage pour initialiser les données
runAnalysis();