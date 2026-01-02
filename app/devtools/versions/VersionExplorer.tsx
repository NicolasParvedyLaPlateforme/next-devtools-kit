"use client";

import React, { useState, useEffect } from 'react';
import { FileCode, Layers, FunctionSquare, Variable, Braces, ArrowRightLeft, Box, LayoutGrid, Search } from 'lucide-react';
import { FileData } from './types';
import { CollapsibleSection, CodeBlock } from './shared-ui';

const StatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: number, color: string }) => (
    <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] flex items-center gap-4 hover:border-slate-500 transition-colors shadow-sm">
        <div className={`w-10 h-10 rounded-lg bg-[#0d1117] flex items-center justify-center border border-slate-800 ${color}`}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <div className="text-2xl font-bold text-white leading-none mb-1">{value}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
        </div>
    </div>
);

const FileDetailView = ({ data, fileName }: { data: FileData, fileName: string }) => {
    const totalFunctions = data.structure.functions?.length || 0;
    const globalVars = data.structure.variables?.length || 0;
    const localVars = (data.structure.functions || []).reduce((acc, fn) => acc + (fn.variables?.length || 0), 0);
    const totalTypes = (data.structure.types?.length || 0) + (data.structure.interfaces?.length || 0) + (data.structure.classes?.length || 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* EN-TÊTE FICHIER */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <FileCode className="text-blue-500 w-8 h-8" /> 
                    {fileName}
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={FunctionSquare} label="Fonctions" value={totalFunctions} color="text-purple-400" />
                    <StatCard icon={Variable} label="Variables" value={globalVars + localVars} color="text-blue-400" />
                    <StatCard icon={Braces} label="Types" value={totalTypes} color="text-emerald-400" />
                    <StatCard icon={ArrowRightLeft} label="Imports" value={data.structure.imports?.length || 0} color="text-amber-400" />
                </div>
            </div>

            {/* IMPORTS */}
            {data.structure.imports?.length > 0 && (
                <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                          <ArrowRightLeft className="w-3 h-3" /> Imports
                      </h3>
                      <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden divide-y divide-[#30363d]">
                         {data.structure.imports.map((imp, i) => (
                            <div key={`${imp.module}-${i}`} className="px-4 py-2 text-xs font-mono text-slate-300 hover:bg-[#1c2128] transition-colors flex items-center gap-2">
                                <span className="text-pink-400">import</span>
                                <span className="text-slate-400 truncate flex-1">{imp.text.replace(/^import\s+/, '')}</span>
                            </div>
                         ))}
                      </div>
                </div>
            )}

            {/* VARIABLES GLOBALES */}
            {data.structure.variables?.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Variable className="w-3 h-3" /> Variables Globales
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                        {data.structure.variables.map((g, i) => (
                            <div key={`${g.name}-${i}`} className="bg-[#161b22] px-4 py-3 rounded-lg border border-[#30363d] font-mono text-xs flex items-center gap-2 hover:border-blue-500/50 transition-colors">
                                <span className="text-purple-400 font-bold">{g.kind || 'const'}</span> 
                                <span className="text-blue-300 font-bold">{g.name}</span> 
                                <span className="text-slate-600">:</span> 
                                <span className="text-slate-400 italic">{g.type}</span>
                                {g.value && (
                                    <>
                                        <span className="text-slate-600">=</span> 
                                        <span className="text-slate-500 truncate max-w-[200px]" title={g.value}>{g.value.substring(0, 100)}</span>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TYPES & CLASSES */}
            {(data.structure.classes?.length > 0 || data.structure.types?.length > 0 || data.structure.interfaces?.length > 0) && (
                <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                          <Box className="w-3 h-3" /> Types & Classes
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {data.structure.classes?.map((cls, i) => (
                            <CollapsibleSection 
                                key={`${cls.name}-${i}`}
                                title={<span className="font-mono">class <span className="text-emerald-300">{cls.name}</span></span>}
                                subtitle={`${cls.properties.length} props, ${cls.methods.length} methods`}
                                icon={LayoutGrid}
                                colorClass="text-emerald-400"
                            >
                                <div className="space-y-2">
                                    {cls.properties.map((p, idx) => (
                                        <div key={`${p.name}-${idx}`} className="text-xs font-mono text-slate-400 pl-2 border-l border-emerald-800">
                                            prop {p.name}
                                        </div>
                                    ))}
                                    {cls.methods.map((m, idx) => (
                                        <div key={`${m.name}-${idx}`} className="text-xs font-mono text-emerald-200/70 pl-2 border-l border-emerald-800">
                                            method {m.name}()
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleSection>
                        ))}
                        {data.structure.interfaces?.map((int, i) => (
                             <CollapsibleSection 
                                key={`${int.name}-${i}`}
                                title={<span className="font-mono">interface <span className="text-emerald-200">{int.name}</span></span>}
                                icon={Braces}
                                colorClass="text-emerald-400"
                            >
                                <CodeBlock code={int.value || ""} color="text-emerald-100" />
                            </CollapsibleSection>
                        ))}
                        {data.structure.types?.map((typ, i) => (
                            <CollapsibleSection 
                                key={`${typ.name}-${i}`}
                                title={<span className="font-mono">type <span className="text-emerald-200">{typ.name}</span></span>}
                                icon={Braces}
                                colorClass="text-emerald-400"
                            >
                                <CodeBlock code={typ.value || ""} color="text-emerald-100" />
                            </CollapsibleSection>
                        ))}
                      </div>
                </div>
            )}

            {/* FONCTIONS */}
            {data.structure.functions?.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <FunctionSquare className="w-3 h-3" /> Fonctions ({data.structure.functions.length})
                    </h3>
                    <div className="space-y-2">
                        {data.structure.functions.map((fn, i) => (
                            <CollapsibleSection
                                key={`${fn.name}-${i}`}
                                title={
                                    <span className="font-mono text-xs">
                                        <span className="text-purple-400">function</span> <span className="text-yellow-200 font-bold text-sm">{fn.name}</span>
                                        <span className="text-slate-400 opacity-75 ml-2">{fn.signature.replace(fn.name, '')}</span>
                                    </span>
                                }
                                subtitle={`${fn.variables.length} variables internes`}
                                icon={FunctionSquare}
                                colorClass="text-yellow-400"
                            >
                                <div className="space-y-6">
                                    {/* Variables internes */}
                                    {fn.variables && fn.variables.length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                                <Layers className="w-3 h-3" /> Variables Locales
                                            </h4>
                                            <div className="grid grid-cols-1 gap-2 pl-2 border-l border-slate-800">
                                                {fn.variables.map((v, idx) => (
                                                    <div key={`${v.name}-${idx}`} className="text-xs font-mono">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-blue-400">const</span> 
                                                            <span className="text-blue-200 font-bold">{v.name}</span>
                                                            <span className="text-slate-500">:</span> 
                                                            <span className="text-slate-400 italic">{v.type}</span>
                                                        </div>
                                                        {v.value && v.value.length < 50 ? (
                                                            <span className="text-slate-500 text-[10px]">= {v.value}</span>
                                                        ) : (
                                                            v.value && <CodeBlock code={v.value} color="text-blue-100" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Code Body */}
                                    {fn.jsxReturn && (
                                        <div>
                                            <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Rendu JSX</h4>
                                            <CodeBlock code={fn.jsxReturn} color="text-yellow-100" label="JSX" />
                                        </div>
                                    )}
                                    {!fn.jsxReturn && fn.fullText && (
                                        <div>
                                            <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Code Source</h4>
                                            <CodeBlock code={fn.fullText} color="text-slate-300" label="Full Body" />
                                        </div>
                                    )}
                                </div>
                            </CollapsibleSection>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface VersionExplorerProps {
    version: string;
    files: string[];
}

export default function VersionExplorer({ version, files }: VersionExplorerProps) {
    const [selectedFile, setSelectedFile] = useState<string>('');
    const [fileData, setFileData] = useState<FileData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;

        if (version && selectedFile) {
            const fetchData = async () => {
                setLoading(true);
                try {
                    const r = await fetch(`/api/devtools/versions?version=${version}&file=${selectedFile}`);
                    const data = await r.json();
                    if (isMounted) {
                        setFileData(data);
                    }
                } catch (error) {
                    console.error("Failed to load version file", error);
                } finally {
                    if (isMounted) {
                        setLoading(false);
                    }
                }
            };
            fetchData();
        }

        return () => {
            isMounted = false;
        };
    }, [version, selectedFile]);

    return (
        <div className="flex h-full">
            <div className="w-72 border-r border-[#30363d] bg-[#161b22] flex-col flex shrink-0 z-20">
                 <div className="p-4 border-b border-[#30363d] text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Fichiers ({files.length})
                 </div>
                 <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                     {files.map(f => (
                         <button key={f} onClick={() => setSelectedFile(f)} className={`w-full text-left px-3 py-2 text-xs rounded-md truncate transition-all flex items-center gap-2 ${selectedFile === f ? 'bg-purple-600 text-white shadow-md font-bold' : 'text-slate-400 hover:text-white hover:bg-[#21262d]'}`}>
                             <FileCode className={`w-3 h-3 ${selectedFile === f ? 'text-white' : 'text-slate-500'}`} />
                             {f.replace('.json', '').replace(/_/g, '/')}
                         </button>
                     ))}
                 </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 scrollbar-thin relative z-10 bg-[#0d1117]">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#30363d 1px, transparent 1px), linear-gradient(90deg, #30363d 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                
                <div className="max-w-5xl mx-auto relative z-10">
                    {loading ? (
                         <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
                             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
                         </div>
                    ) : fileData && selectedFile ? (
                        <FileDetailView data={fileData} fileName={selectedFile.replace('.json', '').replace(/_/g, '/')} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[70vh] text-slate-600">
                            <div className="w-20 h-20 bg-[#161b22] rounded-full flex items-center justify-center mb-6 border border-[#30363d] shadow-2xl animate-pulse">
                                <Search className="w-8 h-8 text-purple-500" />
                            </div>
                            <h3 className="text-xl font-medium text-slate-300">Sélectionnez un fichier</h3>
                            <p className="text-sm text-slate-500 mt-2 max-w-sm text-center">Utilisez la barre latérale pour naviguer dans la structure détaillée de la version sélectionnée.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}