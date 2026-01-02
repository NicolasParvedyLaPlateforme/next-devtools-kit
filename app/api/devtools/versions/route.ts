import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const OUTPUT_ROOT = 'devtools_data/composition';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const version = searchParams.get('version');
    const file = searchParams.get('file');
    
    const rootPath = path.join(process.cwd(), OUTPUT_ROOT);

    if (version && file) {
        const filePath = path.join(rootPath, version, file);
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                return NextResponse.json(JSON.parse(content));
            } catch (e) {
                return NextResponse.json({ error: "Invalid file" }, { status: 500 });
            }
        } else {
            return NextResponse.json(null);
        }
    }

    if (version) {
        const versionPath = path.join(rootPath, version);
        if (fs.existsSync(versionPath)) {
            try {
                const files = fs.readdirSync(versionPath).filter(f => f.endsWith('.json'));
                return NextResponse.json(files);
            } catch (e) {
                return NextResponse.json({ error: "Cannot read version" }, { status: 500 });
            }
        } else {
            return NextResponse.json([], { status: 404 });
        }
    }

    if (!fs.existsSync(rootPath)) {
        return NextResponse.json([]);
    }

    try {
        const items = fs.readdirSync(rootPath);
        const versions = items
            .filter(item => item.startsWith('version_') && fs.statSync(path.join(rootPath, item)).isDirectory())
            .sort()
            .reverse();

        return NextResponse.json(versions);
    } catch (error) {
        return NextResponse.json({ error: "Cannot list versions" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const version = searchParams.get('version');

    if (!version || !version.startsWith('version_') || version.includes('..')) {
        return NextResponse.json({ error: "Invalid version name" }, { status: 400 });
    }

    const targetPath = path.join(process.cwd(), OUTPUT_ROOT, version);

    try {
        if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { recursive: true, force: true });
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}