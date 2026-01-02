const { Project, SyntaxKind, Node } = require('ts-morph');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const OUTPUT_ROOT = 'devtools_data/composition';

/**
 * Détermine dynamiquement si on analyse 'src/app' ou 'app'
 */
function getTargetFolder() {
    const root = process.cwd();
    // Priorité au dossier src/app (Standard Next.js récent)
    if (fs.existsSync(path.join(root, 'src', 'app'))) {
        return 'src/app';
    }
    return 'app';
}

/**
 * Détermine le nom du dossier de sortie (Timestamp ou Current)
 */
function getOutputFolder() {
    // Récupère les arguments passés au script
    const args = process.argv.slice(2);
    
    // Si l'argument "save" est présent
    if (args.includes('save')) {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        // Remplacer les deux points par des tirets pour compatibilité Windows
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        return `version_${date}_${time}`;
    }
    
    return 'version_current';
}

// --- UTILITAIRES ---

function ensureDirectory(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cleanCode(text) {
    if (!text) return null;
    return text.trim();
}

function generateHash(text) {
    if (!text) return "";
    return text.replace(/\s+/g, '');
}

function getLoc(node) {
    return {
        start: node.getStartLineNumber(),
        end: node.getEndLineNumber(),
        lines: node.getEndLineNumber() - node.getStartLineNumber() + 1
    };
}

function getModifiers(node) {
    return node.getModifiers ? node.getModifiers().map(m => m.getText()) : [];
}

function getDocs(node) {
    if (!node.getJsDocs) return [];
    return node.getJsDocs().map(doc => ({
        description: doc.getDescription().trim(),
        tags: doc.getTags().map(t => ({ name: t.getTagName(), text: t.getComment() }))
    }));
}

// --- ANALYSEURS AST ---

// Extrait propriétés et méthodes d'une Interface, Classe ou Type Literal
function extractTypeMembers(node) {
    const properties = [];
    const methods = [];

    const members = node.getMembers ? node.getMembers() : [];

    members.forEach(member => {
        if (Node.isPropertySignature(member) || Node.isPropertyDeclaration(member)) {
            properties.push({
                name: member.getName(),
                type: member.getType().getText(),
                visibility: member.getScope ? member.getScope() : 'public',
                readonly: member.isReadonly ? member.isReadonly() : false,
                optional: member.hasQuestionToken ? member.hasQuestionToken() : false,
                docs: getDocs(member),
                loc: getLoc(member)
            });
        } 
        else if (Node.isMethodSignature(member) || Node.isMethodDeclaration(member)) {
            methods.push({
                name: member.getName(),
                visibility: member.getScope ? member.getScope() : 'public',
                returnType: member.getReturnType().getText(),
                params: member.getParameters().map(p => `${p.getName()}: ${p.getType().getText()}`),
                docs: getDocs(member),
                loc: getLoc(member)
            });
        }
    });

    return { properties, methods };
}

// Analyse le contenu d'une fonction (Body, variables, etc.)
function processFunction(node, targetArray, name, modifiers = [], docs = [], loc = {}, originalSignature = null) {
    const params = node.getParameters().map(p => ({
        name: p.getName(),
        type: p.getType().getText(),
        initializer: p.getInitializer() ? p.getInitializer().getText() : null
    }));

    const localVars = [];
    const hooks = []; 

    node.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach(vd => {
        const parentFn = vd.getFirstAncestor(a => 
            [SyntaxKind.FunctionDeclaration, SyntaxKind.ArrowFunction, SyntaxKind.FunctionExpression, SyntaxKind.MethodDeclaration].includes(a.getKind())
        );
        
        if (parentFn === node) {
            const init = vd.getInitializer();
            const varName = vd.getName();
            const value = init ? cleanCode(init.getText()) : "undefined";

            localVars.push({
                name: varName,
                type: vd.getType().getText(),
                value: value,
                loc: getLoc(vd)
            });

            if (value && value.startsWith('use')) {
                hooks.push(value.split('(')[0]);
            }
        }
    });

    let jsxReturn = null;
    node.forEachDescendant(child => {
        if (child.getKind() === SyntaxKind.ReturnStatement) {
            const expr = child.getExpression();
            if (expr && (
                expr.getKind() === SyntaxKind.JsxElement || 
                expr.getKind() === SyntaxKind.JsxFragment || 
                expr.getKind() === SyntaxKind.ParenthesizedExpression
            )) {
                if(expr.getText().includes('<')) {
                    jsxReturn = cleanCode(expr.getText());
                }
            }
        }
    });

    targetArray.push({
        name: name || "Anonymous",
        signature: originalSignature || `(${params.map(p => p.name).join(', ')})`,
        returnType: node.getReturnType().getText(),
        params,
        variables: localVars,
        modifiers,
        docs,
        jsxReturn,
        hooks: [...new Set(hooks)], 
        bodyHash: generateHash(node.getBodyText ? node.getBodyText() : ""),
        fullText: cleanCode(node.getText()), 
        loc 
    });
}

// --- COEUR DE L'ANALYSE ---

function analyzeFile(sourceFile) {
    const filePath = sourceFile.getFilePath();
    
    const data = {
        meta: { 
            filePath, 
            fileName: path.basename(filePath),
            loc: { lines: sourceFile.getEndLineNumber() }
        },
        stats: { classes: 0, functions: 0, variables: 0, types: 0 },
        structure: {
            imports: [],
            exports: [],
            classes: [],
            enums: [],
            types: [],
            interfaces: [],
            variables: [],
            functions: []
        }
    };

    // 1. IMPORTS
    sourceFile.getImportDeclarations().forEach(imp => {
        data.structure.imports.push({
            module: imp.getModuleSpecifierValue(),
            default: imp.getDefaultImport() ? imp.getDefaultImport().getText() : null,
            named: imp.getNamedImports().map(n => ({
                name: n.getName(),
                alias: n.getAliasNode() ? n.getAliasNode().getText() : null
            })),
            text: imp.getText(),
            loc: getLoc(imp)
        });
    });

    // 2. EXPORTS
    sourceFile.getExportDeclarations().forEach(exp => {
        data.structure.exports.push({
            module: exp.getModuleSpecifierValue(),
            named: exp.getNamedExports().map(n => n.getName()),
            loc: getLoc(exp)
        });
    });

    // 3. TYPES & INTERFACES
    sourceFile.getTypeAliases().forEach(type => {
        data.stats.types++;
        const typeNode = type.getTypeNode();
        let members = { properties: [], methods: [] };

        if (typeNode && Node.isTypeLiteral(typeNode)) {
            members = extractTypeMembers(typeNode);
        }

        data.structure.types.push({
            kind: 'TypeAlias',
            name: type.getName(),
            value: cleanCode(typeNode ? typeNode.getText() : ""),
            ...members, 
            hash: generateHash(type.getText()),
            modifiers: getModifiers(type),
            docs: getDocs(type),
            loc: getLoc(type)
        });
    });

    sourceFile.getInterfaces().forEach(int => {
        data.stats.types++;
        const members = extractTypeMembers(int);
        
        data.structure.interfaces.push({
            kind: 'Interface',
            name: int.getName(),
            extends: int.getExtends().map(e => e.getText()),
            value: cleanCode(int.getText()),
            ...members,
            hash: generateHash(int.getText()),
            modifiers: getModifiers(int),
            docs: getDocs(int),
            loc: getLoc(int)
        });
    });

    // 4. ENUMS
    sourceFile.getEnums().forEach(en => {
        data.structure.enums.push({
            name: en.getName(),
            members: en.getMembers().map(m => ({
                name: m.getName(),
                value: m.getValue()
            })),
            modifiers: getModifiers(en),
            loc: getLoc(en)
        });
    });

    // 5. CLASSES
    sourceFile.getClasses().forEach(cls => {
        data.stats.classes++;
        const members = extractTypeMembers(cls);
        
        data.structure.classes.push({
            name: cls.getName() || "Anonymous",
            extends: cls.getExtends() ? cls.getExtends().getText() : null,
            implements: cls.getImplements().map(i => i.getText()),
            modifiers: getModifiers(cls),
            decorators: cls.getDecorators().map(d => d.getText()),
            docs: getDocs(cls),
            properties: members.properties,
            methods: members.methods,
            loc: getLoc(cls)
        });
    });

    // 6. VARIABLES GLOBALES & HOCS
    sourceFile.getVariableStatements().forEach(stmt => {
        if (stmt.getParent().getKind() !== SyntaxKind.SourceFile) return;
        
        stmt.getDeclarations().forEach(decl => {
            const name = decl.getName();
            const init = decl.getInitializer();
            
            if (!init) return;

            let targetNode = null;
            let customSignature = null;
            let isFunctionLike = false;

            if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) {
                targetNode = init;
                isFunctionLike = true;
                customSignature = `${name} = ${init.getText().split('{')[0]}...`;
            }
            else if (Node.isCallExpression(init)) {
                const expr = init.getExpression();
                const exprText = expr.getText();
                
                if (['forwardRef', 'memo', 'React.forwardRef', 'React.memo'].some(t => exprText.includes(t))) {
                    const args = init.getArguments();
                    if (args.length > 0) {
                        const firstArg = args[0];
                        if (Node.isArrowFunction(firstArg) || Node.isFunctionExpression(firstArg)) {
                            targetNode = firstArg;
                            isFunctionLike = true;
                            customSignature = `${name} = ${exprText}(...)`;
                        }
                    }
                }
            }

            if (isFunctionLike && targetNode) {
                processFunction(
                    targetNode, 
                    data.structure.functions, 
                    name, 
                    getModifiers(stmt), 
                    getDocs(stmt), 
                    getLoc(stmt),
                    customSignature
                );
                data.stats.functions++;
            } else {
                data.stats.variables++;
                data.structure.variables.push({
                    name,
                    kind: stmt.getDeclarationKind(),
                    type: decl.getType().getText(),
                    value: cleanCode(init.getText()),
                    hash: generateHash(init.getText()),
                    modifiers: getModifiers(stmt),
                    docs: getDocs(stmt),
                    loc: getLoc(stmt)
                });
            }
        });
    });

    // 7. EXPORT ASSIGNMENTS (Gère export default forwardRef(...))
    sourceFile.getExportAssignments().forEach(exp => {
        const expr = exp.getExpression();
        
        // On cherche des HOCs comme forwardRef, memo...
        if (Node.isCallExpression(expr)) {
            const exprText = expr.getExpression().getText(); // "forwardRef"
            
            // Si c'est un HOC connu ou générique
            if (['forwardRef', 'memo', 'React.forwardRef', 'React.memo'].some(t => exprText.includes(t))) {
                const args = expr.getArguments();
                if (args.length > 0) {
                    const innerComp = args[0];
                    let compName = "AnonymousDefault";

                    // On essaie de trouver le nom de la fonction interne : forwardRef(function Input() { ... })
                    if (Node.isFunctionExpression(innerComp) || Node.isArrowFunction(innerComp)) {
                        if (innerComp.getName && innerComp.getName()) {
                            compName = innerComp.getName();
                        } else {
                            // Fallback : on essaie de deviner via le nom du fichier si anonyme
                            compName = data.meta.fileName.split('.')[0]; 
                        }

                        // On l'ajoute comme une "Fonction" pour qu'il soit comparable
                        processFunction(
                            innerComp, 
                            data.structure.functions, 
                            compName, 
                            ['export', 'default'], // On simule les modificateurs
                            getDocs(exp.getParent()), // JSDoc souvent au dessus de l'export
                            getLoc(exp),
                            `export default ${exprText}(...)`
                        );
                        data.stats.functions++;
                    }
                }
            }
        }
    });

    // 8. FONCTIONS CLASSIQUES
    sourceFile.getFunctions().forEach(fn => {
        data.stats.functions++;
        processFunction(fn, data.structure.functions, fn.getName(), getModifiers(fn), getDocs(fn), getLoc(fn));
    });

    return data;
}

// --- MAIN ---
async function main() {
    const projectRoot = process.cwd();
    const targetFolder = getTargetFolder();
    const folderName = getOutputFolder();
    const outputDir = path.join(projectRoot, OUTPUT_ROOT, folderName);
    
    console.log(`🚀 Analyse DevTools sur le dossier : ${targetFolder}`);
    console.log(`📦 Dossier de sortie : ${folderName}`);

    // Si c'est le dossier "current" (WIP), on nettoie avant pour éviter les fichiers orphelins
    if (folderName === 'version_current') {
        if (fs.existsSync(outputDir)) {
            fs.rmSync(outputDir, { recursive: true, force: true });
        }
    }
    
    ensureDirectory(outputDir);

    const project = new Project({
        tsConfigFilePath: path.join(projectRoot, "tsconfig.json"),
        skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths(`${targetFolder}/**/*.{ts,tsx}`);
    const sourceFiles = project.getSourceFiles();

    if (sourceFiles.length === 0) {
        console.warn(`⚠️  ATTENTION: Aucun fichier trouvé dans ${targetFolder} ! Vérifiez votre arborescence.`);
    }

    sourceFiles.forEach(sourceFile => {
        const relativePath = path.relative(projectRoot, sourceFile.getFilePath());
        // Normalise les noms de fichiers pour l'OS (remplace les slashs par des underscores)
        const outputFileName = relativePath.split(path.sep).join('_').replace(/[\/\\]/g, '_') + '.json';
        const outputPath = path.join(outputDir, outputFileName);
        
        try {
            const analysisData = analyzeFile(sourceFile);
            fs.writeFileSync(outputPath, JSON.stringify(analysisData, null, 2));
        } catch (err) {
            console.error(`❌ Erreur parsing ${relativePath}:`, err);
        }
    });
    
    if (folderName === 'version_current') {
        console.log(`📝 Snapshot TEMPORAIRE mis à jour.`);
    } else {
        console.log(`✅ Snapshot SAUVEGARDÉ : /${folderName}`);
    }
}

main().catch(console.error);