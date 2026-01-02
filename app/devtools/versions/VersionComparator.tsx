"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { FileCode, FileDiff, MoveRight, ArrowRight, CornerDownRight, ChevronRight, ChevronDown } from 'lucide-react';
import { FileDiff as FileDiffType, ChangeDetail, FileData } from './types';
import { DiffBadge, ElementBadge, MicroDiffViewer, processSmartDiff } from './shared-ui';

// ==========================================
// 1. SIDEBAR AMÉLIORÉE (SUB-ITEMS)
// ==========================================

const ChangeGroupItem = ({ change, onSelectChange }: { change: ChangeDetail, onSelectChange: (id: string) => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const subChanges = useMemo(() => {
        if (change.type === 'MODIF' && change.isBlockCode && change.oldVal && change.newVal) {
            const lines = processSmartDiff(change.oldVal, change.newVal, change.newLineNo || change.oldLineNo || 1);
            return lines.filter(l => l.type !== 'eq').map((l, idx) => ({ ...l, internalIdx: idx }));
        }
        return [];
    }, [change]);

    const hasSubChanges = subChanges.length > 0;

    return (
        <div className="mb-1">
            <button
                onClick={() => {
                    if (hasSubChanges) setIsExpanded(!isExpanded);
                    onSelectChange(change.id);
                }}
                className={`group w-full text-left px-2 py-1.5 rounded text-[11px] text-slate-400 hover:text-slate-200 hover:bg-[#1f242c] transition-all flex items-center gap-2 border border-transparent hover:border-slate-700`}
            >
                <div className={`absolute -left-[13px] w-2.5 h-[1px] bg-slate-800 top-[14px]`}></div>
                
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {hasSubChanges && (
                        <div className="text-slate-600">
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </div>
                    )}
                    <span className={`uppercase font-bold text-[9px] px-1 rounded bg-slate-800 text-slate-500 border border-slate-700 min-w-[24px] text-center`}>
                        {change.elementType.substring(0, 3)}
                    </span>
                    <span className="truncate">{change.label}</span>
                </div>
            </button>

            {isExpanded && hasSubChanges && (
                <div className="ml-6 border-l border-slate-800 pl-2 mt-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {subChanges.map((sub, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                const elementId = `${change.id}-chunk-${sub.internalIdx}`;
                                const el = document.getElementById(elementId);
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    el.classList.add('ring-2', 'ring-purple-500');
                                    setTimeout(() => el.classList.remove('ring-2', 'ring-purple-500'), 1000);
                                }
                            }}
                            className="w-full text-left px-2 py-1 rounded text-[10px] text-slate-500 hover:text-blue-300 hover:bg-[#1f242c] flex items-center gap-2 truncate group/sub"
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                                sub.type === 'modif' ? 'bg-blue-500' : 
                                sub.type === 'add' ? 'bg-green-500' : 'bg-red-500'
                            }`}></span>
                            <span className="font-mono opacity-70">Ligne {sub.newLineNo || sub.oldLineNo}</span>
                            <span className="truncate opacity-50 group-hover/sub:opacity-100 transition-opacity">
                                {sub.type === 'modif' ? 'Modification' : sub.type === 'add' ? 'Ajout' : 'Suppression'}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const ChangeGroup = ({ title, changes, colorClass, bgClass, onSelectChange }: { 
    title: string, changes: ChangeDetail[], colorClass: string, bgClass: string, onSelectChange: (id: string) => void 
}) => {
    if (changes.length === 0) return null;

    return (
        <div className="ml-3 border-l border-slate-800 pl-3 mb-2 relative">
            <div className={`text-[10px] font-bold ${colorClass} mb-1 flex items-center gap-1.5 select-none`}>
                <div className={`w-1.5 h-1.5 rounded-full ${bgClass}`}></div>
                {title} <span className="opacity-50">({changes.length})</span>
            </div>
            <div className="space-y-0.5">
                {changes.map(change => (
                    <ChangeGroupItem key={change.id} change={change} onSelectChange={onSelectChange} />
                ))}
            </div>
        </div>
    );
};

const FileTreeItem = ({ diff, onSelectChange }: { diff: FileDiffType, onSelectChange: (id: string) => void }) => {
    const [isOpen, setIsOpen] = useState(true);

    const modifs = diff.changes.filter(c => c.type === 'MODIF');
    const ajouts = diff.changes.filter(c => c.type === 'AJOUT');
    const dels = diff.changes.filter(c => c.type === 'SUPPRESSION');
    const moves = diff.changes.filter(c => c.type === 'DEPLACEMENT');

    return (
        <div className="mb-4">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-slate-300 hover:bg-[#1f242c] hover:text-white transition-colors rounded mb-1 group"
            >
                {isOpen ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                <FileCode className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                <span className="truncate">{diff.file.replace('.json', '').replace(/_/g, '/')}</span>
            </button>

            {isOpen && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <ChangeGroup title="MODIFICATIONS" changes={modifs} colorClass="text-blue-400" bgClass="bg-blue-500" onSelectChange={onSelectChange} />
                    <ChangeGroup title="AJOUTS" changes={ajouts} colorClass="text-green-400" bgClass="bg-green-500" onSelectChange={onSelectChange} />
                    <ChangeGroup title="DÉPLACEMENTS" changes={moves} colorClass="text-purple-400" bgClass="bg-purple-500" onSelectChange={onSelectChange} />
                    <ChangeGroup title="SUPPRESSIONS" changes={dels} colorClass="text-red-400" bgClass="bg-red-500" onSelectChange={onSelectChange} />
                </div>
            )}
        </div>
    );
};

const DiffSidebar = ({ diffs, onSelectChange }: { diffs: FileDiffType[], onSelectChange: (id: string) => void }) => {
    return (
        <div className="w-80 border-r border-[#30363d] bg-[#0d1117] flex flex-col h-full sticky top-0 overflow-hidden">
            <div className="p-4 border-b border-[#30363d] bg-[#161b22]/50 font-bold text-slate-300 flex items-center gap-2 text-xs uppercase tracking-wider">
                <FileDiff className="w-4 h-4 text-purple-400" />
                Explorateur
            </div>
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                {diffs.map((diff) => (
                    <FileTreeItem key={diff.file} diff={diff} onSelectChange={onSelectChange} />
                ))}
            </div>
        </div>
    );
};

// ==========================================
// 2. COMPOSANTS DE RENDU
// ==========================================

const ChangeRow = ({ item, id }: { item: ChangeDetail, id: string }) => {
    const startLine = item.newLineNo || item.oldLineNo || 1;

    return (
        <div id={id} className="bg-[#161b22]/50 border border-[#30363d] rounded-lg p-3 mb-6 hover:border-slate-500 transition-colors group scroll-mt-20">
            <div className="flex items-center gap-3 mb-2">
                <DiffBadge type={item.type} />
                <div className="flex items-center gap-2 min-w-0">
                    <ElementBadge type={item.elementType} />
                    <span className="font-bold text-slate-200 text-sm truncate" title={item.label}>{item.label}</span>
                </div>
                
                {item.type === 'DEPLACEMENT' && item.oldLineNo && item.newLineNo && (
                    <div className="ml-auto flex items-center gap-2 text-xs bg-purple-500/10 text-purple-300 px-2 py-1 rounded border border-purple-500/20">
                        <span className="opacity-70">Ligne {item.oldLineNo}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="font-bold">Ligne {item.newLineNo}</span>
                    </div>
                )}

                {item.parentScope && (
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 ml-auto whitespace-nowrap">
                        <span className="hidden sm:inline">dans</span> 
                        <span className="text-purple-400 font-mono bg-purple-400/10 px-1 rounded">{item.parentScope}</span>
                    </div>
                )}
            </div>
            <div className="pl-1">
                {item.type === 'DEPLACEMENT' ? (
                    <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded text-center text-purple-300 text-xs flex flex-col items-center gap-2">
                        <CornerDownRight className="w-6 h-6 opacity-50" />
                        <p>Le bloc de code a été déplacé sans modification de contenu.</p>
                        <div className="flex gap-4 opacity-70 font-mono mt-1">
                            <span>Hash: {item.oldVal?.substring(0, 10)}...</span>
                        </div>
                    </div>
                ) : item.isBlockCode ? (
                    <MicroDiffViewer 
                        oldCode={item.oldVal || ''} 
                        newCode={item.newVal || ''} 
                        startingLine={startLine} 
                        id={id} 
                    />
                ) : (
                    <div className="font-mono text-[11px] space-y-1 mt-2">
                        {item.type === 'MODIF' && (
                            <div className="text-red-300 bg-red-900/10 px-2 py-1.5 rounded border-l-2 border-red-500/30 flex gap-2 items-center">
                                <span className="opacity-50 select-none w-3">-</span>
                                <span className="line-through opacity-60 truncate block w-full">{item.oldVal}</span>
                            </div>
                        )}
                        <div className="text-green-300 bg-green-900/10 px-2 py-1.5 rounded border-l-2 border-green-500/30 flex gap-2 items-center">
                             <span className="opacity-50 select-none w-3">+</span>
                             <span className="font-bold truncate block w-full">{item.newVal}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================================
// 3. LOGIQUE & MAIN (Avec Anti-Cache)
// ==========================================

const computeFileDiff = (fileName: string, oldD: FileData | null, newD: FileData | null): FileDiffType | null => {
    if (!oldD) return { file: fileName, status: 'NOUVEAU', changes: [] };
    if (!newD) return { file: fileName, status: 'SUPPRIMÉ', changes: [] };
    if (!oldD.structure || !newD.structure) return null;

    const changes: ChangeDetail[] = [];
    let count = 0;
    const generateId = () => `${fileName}-${count++}`;

    const oldFns = oldD.structure.functions || [];
    const newFns = newD.structure.functions || [];
    const oldVars = oldD.structure.variables || [];
    const newVars = newD.structure.variables || [];
    const allFnNames = new Set([...oldFns.map(f => f.name), ...newFns.map(f => f.name)]);

    allFnNames.forEach(fnName => {
        const fOld = oldFns.find(f => f.name === fnName);
        const fNew = newFns.find(f => f.name === fnName);

        if (!fOld && fNew) {
            const vOld = oldVars.find(v => v.name === fnName);
            if (vOld) {
                 changes.push({ id: generateId(), label: fnName, elementType: 'LOGIQUE', type: 'MODIF', oldVal: vOld.value, newVal: fNew.fullText, isBlockCode: true, oldLineNo: vOld.loc?.start, newLineNo: fNew.loc?.start });
            } else {
                 changes.push({ id: generateId(), label: fNew.name, elementType: 'FONCTION', type: 'AJOUT', newVal: fNew.fullText, isBlockCode: true, newLineNo: fNew.loc?.start });
            }
        } 
        else if (fOld && !fNew) {
            const vNew = newVars.find(v => v.name === fnName);
            if (vNew) {
                changes.push({ id: generateId(), label: fnName, elementType: 'LOGIQUE', type: 'MODIF', parentScope: 'Refactor', oldVal: fOld.fullText, newVal: vNew.value, isBlockCode: true, oldLineNo: fOld.loc?.start, newLineNo: vNew.loc?.start });
            } else {
                changes.push({ id: generateId(), label: fOld.name, elementType: 'FONCTION', type: 'SUPPRESSION', oldVal: fOld.fullText, isBlockCode: true, oldLineNo: fOld.loc?.start });
            }
        } 
        else if (fOld && fNew) {
            const isMoved = fOld.bodyHash === fNew.bodyHash && Math.abs((fOld.loc?.start || 0) - (fNew.loc?.start || 0)) > 2;
            
            if (isMoved) {
                changes.push({ id: generateId(), label: fNew.name, elementType: 'FONCTION', type: 'DEPLACEMENT', oldVal: fOld.fullText, newVal: fNew.fullText, oldLineNo: fOld.loc?.start, newLineNo: fNew.loc?.start });
            }
            else if (fOld.bodyHash !== fNew.bodyHash) {
                changes.push({ id: generateId(), label: `Logique : ${fnName}`, elementType: 'LOGIQUE', type: 'MODIF', parentScope: fnName, oldVal: fOld.fullText || '', newVal: fNew.fullText || '', isBlockCode: true, oldLineNo: fOld.loc?.start, newLineNo: fNew.loc?.start });
            }
        }
    });

    const allVarNames = new Set([...oldVars.map(v => v.name), ...newVars.map(v => v.name)]);
    allVarNames.forEach(varName => {
        if (allFnNames.has(varName)) return;
        const o = oldVars.find(x => x.name === varName);
        const n = newVars.find(x => x.name === varName);

        if (!o && n) {
            changes.push({ id: generateId(), label: n.name, elementType: 'VARIABLE', type: 'AJOUT', newVal: n.value, isBlockCode: true, newLineNo: n.loc?.start });
        }
        else if (o && !n) {
            changes.push({ id: generateId(), label: o.name, elementType: 'VARIABLE', type: 'SUPPRESSION', oldVal: o.value, isBlockCode: true, oldLineNo: o.loc?.start });
        }
        else if (o && n && (o.hash !== n.hash || o.value !== n.value)) {
            changes.push({ id: generateId(), label: n.name, elementType: 'VARIABLE', type: 'MODIF', oldVal: o.value, newVal: n.value, isBlockCode: true, oldLineNo: o.loc?.start, newLineNo: n.loc?.start });
        }
    });

    const newTypes = [...(newD.structure.types || []), ...(newD.structure.interfaces || [])];
    const oldTypes = [...(oldD.structure.types || []), ...(oldD.structure.interfaces || [])];
    const allTypeNames = new Set([...oldTypes.map(t => t.name), ...newTypes.map(t => t.name)]);

    allTypeNames.forEach(typeName => {
        const o = oldTypes.find(x => x.name === typeName);
        const n = newTypes.find(x => x.name === typeName);

        if (!o && n) {
            changes.push({ id: generateId(), label: n.name, elementType: 'TYPE', type: 'AJOUT', newVal: n.value, isBlockCode: true, newLineNo: n.loc?.start });
        }
        else if (o && !n) {
            changes.push({ id: generateId(), label: o.name, elementType: 'TYPE', type: 'SUPPRESSION', oldVal: o.value, isBlockCode: true, oldLineNo: o.loc?.start });
        }
        else if (o && n && o.hash !== n.hash) {
            changes.push({ id: generateId(), label: n.name, elementType: 'TYPE', type: 'MODIF', oldVal: o.value, newVal: n.value, isBlockCode: true, oldLineNo: o.loc?.start, newLineNo: n.loc?.start });
        }
    });

    const oldClasses = oldD.structure.classes || [];
    const newClasses = newD.structure.classes || [];
    const allClassNames = new Set([...oldClasses.map(c => c.name), ...newClasses.map(c => c.name)]);

    allClassNames.forEach(clsName => {
        const o = oldClasses.find(c => c.name === clsName);
        const n = newClasses.find(c => c.name === clsName);

        if(!o && n) {
            changes.push({ id: generateId(), label: n.name, elementType: 'CLASS', type: 'AJOUT', newLineNo: n.loc?.start });
        } else if (o && !n) {
            changes.push({ id: generateId(), label: o.name, elementType: 'CLASS', type: 'SUPPRESSION', oldLineNo: o.loc?.start });
        } else if (o && n) {
            if (JSON.stringify(o.properties) !== JSON.stringify(n.properties) || JSON.stringify(o.methods) !== JSON.stringify(n.methods)) {
                 changes.push({ id: generateId(), label: n.name, elementType: 'CLASS', type: 'MODIF', oldLineNo: o.loc?.start, newLineNo: n.loc?.start });
            }
        }
    });

    const oldEnums = oldD.structure.enums || [];
    const newEnums = newD.structure.enums || [];
    const allEnumNames = new Set([...oldEnums.map(e => e.name), ...newEnums.map(e => e.name)]);

    allEnumNames.forEach(enumName => {
        const o = oldEnums.find(e => e.name === enumName);
        const n = newEnums.find(e => e.name === enumName);

        if(!o && n) {
            changes.push({ id: generateId(), label: n.name, elementType: 'TYPE', type: 'AJOUT', isBlockCode: true, newVal: JSON.stringify(n.members, null, 2), newLineNo: n.loc?.start });
        } else if (o && !n) {
            changes.push({ id: generateId(), label: o.name, elementType: 'TYPE', type: 'SUPPRESSION', isBlockCode: true, oldVal: JSON.stringify(o.members, null, 2), oldLineNo: o.loc?.start });
        } else if (o && n && JSON.stringify(o.members) !== JSON.stringify(n.members)) {
            changes.push({ id: generateId(), label: n.name, elementType: 'TYPE', type: 'MODIF', isBlockCode: true, oldVal: JSON.stringify(o.members, null, 2), newVal: JSON.stringify(n.members, null, 2), oldLineNo: o.loc?.start, newLineNo: n.loc?.start });
        }
    });

    if (changes.length === 0) return null;
    return { file: fileName, status: 'MODIFIÉ', changes };
};

interface VersionComparatorProps {
    vOld: string; vNew: string; filesOld: string[]; filesNew: string[];
    onComparisonComplete?: (comparisons: FileDiffType[]) => void;
    refreshTrigger?: number; 
}

export default function VersionComparator({ vOld, vNew, filesOld, filesNew, onComparisonComplete, refreshTrigger = 0 }: VersionComparatorProps) {
    const [comparisons, setComparisons] = useState<FileDiffType[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const compareAllFiles = async () => {
            if (!vOld || !vNew || !filesOld.length || !filesNew.length) return;
            
            if (refreshTrigger === 0) setIsLoading(true);

            const allFiles = Array.from(new Set([...filesOld, ...filesNew]));
            const results: FileDiffType[] = [];
            
            const timestamp = Date.now();

            for (const file of allFiles) {
                const [dOld, dNew] = await Promise.all([
                    filesOld.includes(file) 
                        ? fetch(`/api/devtools/versions?version=${vOld}&file=${file}&t=${timestamp}`).then(r => r.json() as Promise<FileData>) 
                        : Promise.resolve(null),
                    filesNew.includes(file) 
                        ? fetch(`/api/devtools/versions?version=${vNew}&file=${file}&t=${timestamp}`).then(r => r.json() as Promise<FileData>) 
                        : Promise.resolve(null)
                ]);
                const diff = computeFileDiff(file, dOld, dNew);
                if (diff) results.push(diff);
            }
            
            setComparisons(results);
            if(onComparisonComplete) onComparisonComplete(results);
            setIsLoading(false);
        };

        compareAllFiles();
    }, [vOld, vNew, filesOld, filesNew, refreshTrigger]); 

    const scrollToChange = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-purple-500');
            setTimeout(() => el.classList.remove('ring-2', 'ring-purple-500'), 1000);
        }
    };

    if (isLoading) {
        return <div className="flex flex-col items-center justify-center py-20 text-slate-500"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div><p>Analyse...</p></div>;
    }

    return (
        <div className="flex h-full">
            <DiffSidebar diffs={comparisons} onSelectChange={scrollToChange} />

            <div className="flex-1 overflow-y-auto p-8 scrollbar-thin bg-[#0d1117] relative">
                <div className="max-w-5xl mx-auto space-y-12 pb-20">
                    {comparisons.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500 opacity-50">
                            <FileDiff className="w-16 h-16 mb-4" />
                            <p>Aucune modification détectée.</p>
                        </div>
                    ) : (
                        comparisons.map((comp) => (
                            <div key={comp.file} className="space-y-4">
                                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2 border-b border-slate-700 pb-2">
                                    <FileCode className="w-5 h-5 text-blue-400" />
                                    {comp.file.replace('.json', '').replace(/_/g, '/')}
                                </h3>
                                {comp.changes.map((change) => (
                                    <ChangeRow key={change.id} item={change} id={change.id} />
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}