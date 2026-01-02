import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();
// Fichiers à ignorer pour ne pas polluer le contexte
const IGNORE_LIST = [
    '.DS_Store', 'node_modules', '.git', '.next', 'dist', 'build', 
    'devtools_data', '.vscode', '.idea', 'coverage', 'public'
];

const IGNORE_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', 
    '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip', '.mp4'
];

interface FileNode {
    type: 'file' | 'folder';
    name: string;
    path: string;
    children?: FileNode[];
}

function isIgnored(fileName: string) {
    if (IGNORE_LIST.includes(fileName)) return true;
    if (fileName.startsWith('.') && !['.env.example', '.gitignore'].includes(fileName)) return true; 
    const ext = path.extname(fileName).toLowerCase();
    if (IGNORE_EXTENSIONS.includes(ext)) return true;
    return false;
}

function generateTreeString(dir: string, prefix = ''): string {
    if (!fs.existsSync(dir)) return '';
    let output = '';
    const files = fs.readdirSync(dir);
    const filtered = files.filter(f => !isIgnored(f)).sort((a, b) => {
        const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
        const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
    });

    filtered.forEach((file, index) => {
        const isLast = index === filtered.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        output += `${prefix}${connector}${file}\n`;
        
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            const childPrefix = prefix + (isLast ? '    ' : '│   ');
            output += generateTreeString(fullPath, childPrefix);
        }
    });
    return output;
}

function scanDirectoryForUI(dir: string, relativePath: string = ''): FileNode[] {
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir);
    const result: FileNode[] = [];

    files.forEach(file => {
        if (isIgnored(file)) return;
        
        const fullPath = path.join(dir, file);
        const currentRelPath = relativePath ? `${relativePath}/${file}` : file;
        
        let stat;
        try { stat = fs.statSync(fullPath); } catch (_e) { return; }

        if (stat.isDirectory()) {
            const children = scanDirectoryForUI(fullPath, currentRelPath);
            result.push({ type: 'folder', name: file, path: currentRelPath, children });
        } else {
            result.push({ type: 'file', name: file, path: currentRelPath });
        }
    });
    
    return result.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
    });
}

function searchInDirectory(dir: string, term: string, results: string[]) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        if (isIgnored(file)) return;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            searchInDirectory(fullPath, term, results);
        } else {
            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                if (content.toLowerCase().includes(term.toLowerCase())) {
                    const relPath = path.relative(PROJECT_ROOT, fullPath).replace(/\\/g, '/');
                    results.push(relPath);
                }
            } catch (_e) {} 
        }
    });
}

export async function GET() {
    try {
        const tree = scanDirectoryForUI(PROJECT_ROOT);
        return NextResponse.json(tree);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action } = body;

        if (action === 'SEARCH') {
            const { term } = body;
            if (!term || term.length < 3) return NextResponse.json([]);
            const results: string[] = [];
            searchInDirectory(PROJECT_ROOT, term, results);
            return NextResponse.json(results);
        }

        if (action === 'GENERATE') {
            const { prompt, selectedFiles } = body; 

            let finalOutput = "";
            finalOutput += `================================================================================\n`;
            finalOutput += `USER REQUEST\n`;
            finalOutput += `================================================================================\n`;
            finalOutput += `${prompt}\n\n`;

            finalOutput += `================================================================================\n`;
            finalOutput += `PROJECT TREE\n`;
            finalOutput += `================================================================================\n`;
            finalOutput += generateTreeString(PROJECT_ROOT);
            finalOutput += `\n`;

            finalOutput += `================================================================================\n`;
            finalOutput += `SELECTED FILES CONTENT\n`;
            finalOutput += `================================================================================\n`;

            if (!selectedFiles.includes('package.json') && fs.existsSync(path.join(PROJECT_ROOT, 'package.json'))) {
                 finalOutput += `\n--- FILE: package.json (Auto-included) ---\n`;
                 finalOutput += fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf-8') + "\n";
            }

            for (const relPath of selectedFiles) {
                if (relPath.includes('..')) continue;
                const fullPath = path.join(PROJECT_ROOT, relPath);

                if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    finalOutput += `\n==================================================\n`;
                    finalOutput += `FILE: ${relPath}\n`;
                    finalOutput += `==================================================\n`;
                    finalOutput += content + "\n";
                }
            }

            return new NextResponse(finalOutput, {
                status: 200,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        }

        return NextResponse.json({ error: "Unknown Action" }, { status: 400 });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}   