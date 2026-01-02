"use client";

import React, { useState, useEffect } from 'react';
import { Copy, FileText, Folder, CheckSquare, Square, Search, Layers, RefreshCw, X, Check, Wand2 } from 'lucide-react';

// EXEMPLE DE PACKS (À adapter selon ton nouveau projet)
const PACKS: Record<string, string[]> = {
    "CORE": [
        "package.json",
        "next.config.js",
        "tsconfig.json",
        "app/layout.tsx",
        "app/globals.css"
    ],
    "API_ROUTES": [
        "app/api/devtools/analyze/route.ts",
        "app/api/devtools/context/route.ts"
    ],
    "UTILS": [
        "lib/utils.ts" // Exemple générique
    ]
};

interface FileNode {
    type: 'file' | 'folder';
    name: string;
    path: string;
    children?: FileNode[];
}

const FileTreeItem = ({ node, selected, toggle, highlightIds }: { node: FileNode, selected: Set<string>, toggle: (path: string, isFolder: boolean, children?: FileNode[]) => void, highlightIds: string[] }) => {
    const isFolder = node.type === 'folder';
    const isSelected = selected.has(node.path);
    const [isOpen, setIsOpen] = useState(true);
    const isHighlighted = highlightIds.includes(node.path);

    return (
        <div className="pl-4 border-l border-slate-800 ml-1">
            <div className={`flex items-center gap-2 py-0.5 group ${isHighlighted ? 'bg-yellow-900/30 rounded -ml-2 pl-2' : ''}`}>
                <button onClick={() => toggle(node.path, isFolder, node.children)} className="text-slate-500 hover:text-blue-400 transition-colors">
                    {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> : <Square className="w-3.5 h-3.5" />}
                </button>
                
                {isFolder && (
                    <button onClick={() => setIsOpen(!isOpen)} className="text-slate-400 hover:text-slate-200">
                         <Folder className="w-3.5 h-3.5" fill={isOpen ? "currentColor" : "none"} />
                    </button>
                )}
                {!isFolder && <FileText className={`w-3.5 h-3.5 ${isHighlighted ? 'text-yellow-400' : 'text-slate-600'}`} />}

                <span 
                    className={`text-xs cursor-pointer select-none truncate ${isHighlighted ? 'text-yellow-200 font-bold' : 'text-slate-400'} hover:text-white transition-colors`}
                    onClick={() => isFolder ? setIsOpen(!isOpen) : toggle(node.path, false)}
                    title={node.path}
                >
                    {node.name}
                </span>
            </div>
            
            {isFolder && isOpen && node.children && (
                <div>
                    {node.children.map(child => (
                        <FileTreeItem key={child.path} node={child} selected={selected} toggle={toggle} highlightIds={highlightIds} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function ContextBuilderPage() {
    const [prompt, setPrompt] = useState("");
    const [fileTree, setFileTree] = useState<FileNode[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [generatedContent, setGeneratedContent] = useState("");
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        fetch('/api/devtools/context')
            .then(r => r.json())
            .then(data => {
                setFileTree(data);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length >= 3) {
                setIsSearching(true);
                fetch('/api/devtools/context', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'SEARCH', term: searchQuery })
                })
                .then(r => r.json())
                .then(ids => {
                    setSearchResults(ids);
                    setIsSearching(false);
                });
            } else {
                setSearchResults([]);
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const toggleSelection = (path: string, isFolder: boolean, children?: FileNode[]) => {
        const newSet = new Set(selectedFiles);
        const isSelected = newSet.has(path);
        const toggleRecursive = (items: FileNode[], add: boolean) => {
            items.forEach(item => {
                if (add) newSet.add(item.path); else newSet.delete(item.path);
                if (item.children) toggleRecursive(item.children, add);
            });
        };
        if (isSelected) {
            newSet.delete(path);
            if (isFolder && children) toggleRecursive(children, false);
        } else {
            newSet.add(path);
            if (isFolder && children) toggleRecursive(children, true);
        }
        setSelectedFiles(newSet);
    };

    const applyPack = (packFiles: string[]) => {
        const newSet = new Set(selectedFiles);
        packFiles.forEach(f => newSet.add(f));
        setSelectedFiles(newSet);
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return alert("⚠️ Please enter a prompt!");
        const res = await fetch('/api/devtools/context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'GENERATE',
                prompt,
                selectedFiles: Array.from(selectedFiles)
            })
        });
        if (res.ok) {
            const text = await res.text();
            setGeneratedContent(text);
            setShowModal(true);
        } else {
            alert("Generation failed.");
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedContent);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
        <div className="flex h-screen bg-[#0d1117] text-slate-300 font-sans overflow-hidden">
            {/* LEFT CONFIG */}
            <div className="w-[45%] flex flex-col border-r border-slate-800 p-6 gap-6 bg-[#0d1117]">
                <div>
                    <h1 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded px-2 py-0.5 text-xs">AI</span> Context Builder
                    </h1>
                    <p className="text-slate-500 text-xs">Prepare specific contexts to prevent hallucinations.</p>
                </div>

                <div className="flex-1 flex flex-col gap-2 min-h-0">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Your Prompt</label>
                    <textarea 
                        className="flex-1 bg-[#161b22] border border-slate-700 rounded-lg p-4 text-sm focus:border-blue-500 outline-none resize-none font-mono leading-relaxed placeholder:text-slate-600"
                        placeholder="Ex: Explain the architecture of the API routes..."
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Quick Packs</label>
                        <button onClick={() => setSelectedFiles(new Set())} className="text-[10px] text-red-400 hover:text-red-300 underline">Clear All</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                        {Object.keys(PACKS).map(pack => (
                            <button key={pack} onClick={() => applyPack(PACKS[pack])} className="px-3 py-2 border rounded-md text-xs font-bold flex items-center justify-between transition-all bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700">
                                <div className="flex items-center gap-2"><Layers className="w-3 h-3" /> {pack}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <button onClick={handleGenerate} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
                    <Wand2 className="w-5 h-5" /> Generate Context
                </button>
            </div>

            {/* RIGHT EXPLORER */}
            <div className="flex-1 flex flex-col bg-[#010409]">
                <div className="p-4 border-b border-slate-800 bg-[#161b22] flex flex-col gap-3">
                    <div className="relative">
                        <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isSearching ? 'text-blue-500 animate-pulse' : 'text-slate-500'}`} />
                        <input 
                            type="text" placeholder="Smart Search (Content)..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0d1117] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-blue-500 outline-none text-slate-200 placeholder:text-slate-600"
                        />
                        {searchResults.length > 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-yellow-500 font-bold">{searchResults.length} results</span>}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {loading ? <div className="flex items-center justify-center h-full text-slate-500 gap-2"><RefreshCw className="w-5 h-5 animate-spin" /> Loading...</div> : 
                        <div className="space-y-0.5">{fileTree.map(node => <FileTreeItem key={node.path} node={node} selected={selectedFiles} toggle={toggleSelection} highlightIds={searchResults} />)}</div>
                    }
                </div>
            </div>

            {/* MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-8 animate-in fade-in duration-200" onClick={() => setShowModal(false)}>
                    <div className="bg-[#161b22] border border-slate-700 w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-[#0d1117]">
                            <h3 className="font-bold text-slate-200 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500" /> Generated Context</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 bg-[#0d1117]">
                            <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed selection:bg-blue-900/50">{generatedContent}</pre>
                        </div>
                        <div className="p-4 border-t border-slate-700 bg-[#161b22] flex justify-end gap-3">
                            <button onClick={copyToClipboard} className={`px-6 py-2.5 rounded-lg font-bold text-white flex items-center gap-2 transition-all ${copySuccess ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                {copySuccess ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />} {copySuccess ? 'Copied!' : 'Copy All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}