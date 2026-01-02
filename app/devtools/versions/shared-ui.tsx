"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Copy, ChevronDown, ChevronRight, ChevronsUpDown, Eye, EyeOff, ArrowDown, ArrowUp, Minimize2 } from 'lucide-react';
import { ChangeType, ElementType } from './types';

// ==========================================
// 1. ALGORITHMES & TOKENIZER
// ==========================================

interface DiffItem<T> {
    type: 'add' | 'del' | 'eq';
    content: T;
    oldLineNo?: number;
    newLineNo?: number;
}

export interface ProcessedLine {
    type: 'add' | 'del' | 'modif' | 'eq';
    content: string;     
    oldContent?: string; 
    oldLineNo?: number;
    newLineNo?: number;
}

const tokenize = (text: string) => {
    return text.split(/([a-zA-Z0-9_]+|\s+|[^\w\s])/).filter(t => t !== '');
};

const highlightSyntax = (text: string) => {
    const keywords = new Set(['const', 'let', 'var', 'function', 'return', 'if', 'else', 'import', 'export', 'from', 'default', 'interface', 'type', 'async', 'await', 'public', 'private', 'protected', 'class', 'extends', 'implements', 'try', 'catch', 'finally', 'switch', 'case', 'new', 'this']);
    
    if (text.trim().startsWith('//')) {
        return <span className="text-slate-500 italic">{text}</span>;
    }

    return text.split(/(\s+|[^\w\s]|^".*?"$|^'.*?'$)/).map((token, i) => {
        if (keywords.has(token)) return <span key={i} className="text-purple-400 font-bold">{token}</span>;
        if (token.startsWith('"') || token.startsWith("'")) return <span key={i} className="text-yellow-300">{token}</span>;
        if (!isNaN(Number(token)) && token.trim() !== '') return <span key={i} className="text-orange-400">{token}</span>;
        if (token.match(/^[A-Z][a-zA-Z0-9]*$/)) return <span key={i} className="text-emerald-300">{token}</span>; 
        return token;
    });
};

function computeRawDiff(oldLines: string[], newLines: string[], startLine: number = 1): DiffItem<string>[] {
    const N = oldLines.length;
    const M = newLines.length;
    const matrix = Array(N + 1).fill(0).map(() => Array(M + 1).fill(0));

    const normalize = (str: string) => str.replace(/\r$/, '').trim();

    for (let i = 1; i <= N; i++) {
        for (let j = 1; j <= M; j++) {
            if (normalize(oldLines[i - 1]) === normalize(newLines[j - 1])) {
                matrix[i][j] = matrix[i - 1][j - 1] + 1;
            } else {
                matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
            }
        }
    }

    const diffs: DiffItem<string>[] = [];
    let i = N, j = M;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && normalize(oldLines[i - 1]) === normalize(newLines[j - 1])) {
            diffs.unshift({ type: 'eq', content: newLines[j - 1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
            diffs.unshift({ type: 'add', content: newLines[j - 1] });
            j--;
        } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
            diffs.unshift({ type: 'del', content: oldLines[i - 1] });
            i--;
        }
    }

    let oldCounter = startLine;
    let newCounter = startLine;

    return diffs.map(d => {
        if (d.type === 'eq') {
            const res = { ...d, oldLineNo: oldCounter, newLineNo: newCounter };
            oldCounter++; newCounter++;
            return res;
        }
        if (d.type === 'del') {
            const res = { ...d, oldLineNo: oldCounter };
            oldCounter++;
            return res;
        }
        if (d.type === 'add') {
            const res = { ...d, newLineNo: newCounter };
            newCounter++;
            return res;
        }
        return d;
    });
}

const getSimilarity = (s1: string, s2: string): number => {
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;
    const t1 = new Set(tokenize(s1).filter(t => t.trim() !== ''));
    const t2 = new Set(tokenize(s2).filter(t => t.trim() !== ''));
    if (t1.size === 0 || t2.size === 0) return 0;
    let intersection = 0;
    t1.forEach(token => { if (t2.has(token)) intersection++; });
    const union = t1.size + t2.size - intersection;
    return intersection / union;
};

export const processSmartDiff = (oldCode: string, newCode: string, startingLine: number): ProcessedLine[] => {
    const oldLines = oldCode ? oldCode.split(/\r?\n/) : [];
    const newLines = newCode ? newCode.split(/\r?\n/) : [];
    const rawDiffs = computeRawDiff(oldLines, newLines, startingLine);

    const processed: ProcessedLine[] = [];
    const consumedAdds = new Set<number>();
    
    const SIMILARITY_THRESHOLD = 0.4; 
    const LOOKAHEAD_WINDOW = 20;

    for (let i = 0; i < rawDiffs.length; i++) {
        const current = rawDiffs[i];

        if (current.type === 'eq') {
            processed.push({
                type: 'eq',
                content: current.content,
                oldLineNo: current.oldLineNo,
                newLineNo: current.newLineNo
            });
            continue;
        }

        if (current.type === 'add') {
            if (consumedAdds.has(i)) continue;
            processed.push({ 
                type: 'add', 
                content: current.content,
                newLineNo: current.newLineNo,
            });
            continue;
        }

        if (current.type === 'del') {
            let bestMatchIndex = -1;
            let bestMatchScore = 0;

            for (let j = i + 1; j < Math.min(i + LOOKAHEAD_WINDOW, rawDiffs.length); j++) {
                const candidate = rawDiffs[j];
                if (candidate.type === 'add' && !consumedAdds.has(j)) {
                    const score = getSimilarity(current.content, candidate.content);
                    if (score >= SIMILARITY_THRESHOLD && score > bestMatchScore) {
                        bestMatchScore = score;
                        bestMatchIndex = j;
                    }
                }
            }

            if (bestMatchIndex !== -1) {
                const match = rawDiffs[bestMatchIndex];
                processed.push({
                    type: 'modif',
                    oldContent: current.content,
                    content: match.content,
                    oldLineNo: current.oldLineNo,
                    newLineNo: match.newLineNo,
                });
                consumedAdds.add(bestMatchIndex); 
            } else {
                processed.push({ 
                    type: 'del', 
                    content: current.content,
                    oldLineNo: current.oldLineNo,
                });
            }
        }
    }
    return processed;
};

// ==========================================
// 2. COMPOSANTS UI
// ==========================================

const CODE_FONT_STYLE = { 
    fontFamily: '"Geist Mono", "JetBrains Mono", "Fira Code", monospace'
};

export const CollapsibleSection = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  children, 
  defaultOpen = false, 
  colorClass = "text-slate-300"
}: { 
  title: React.ReactNode; subtitle?: React.ReactNode; icon?: React.ElementType; children: React.ReactNode; defaultOpen?: boolean; colorClass?: string;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-[#30363d] rounded-lg bg-[#161b22] overflow-hidden transition-all duration-200">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1c2128] transition-colors text-left"
      >
        {Icon && <Icon className={`w-4 h-4 ${colorClass}`} />}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${colorClass}`}>{title}</div>
          {subtitle && <div className="text-[10px] text-slate-500 truncate">{subtitle}</div>}
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>
      {isOpen && (
        <div className="border-t border-[#30363d] bg-[#0d1117] p-4 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export const DiffBadge = ({ type }: { type: ChangeType }) => {
    const styles = {
        'AJOUT': 'bg-green-500/10 text-green-400 border-green-500/20',
        'SUPPRESSION': 'bg-red-500/10 text-red-400 border-red-500/20',
        'MODIF': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'DEPLACEMENT': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };
    return (
        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${styles[type]}`}>
            {type}
        </span>
    );
};

export const ElementBadge = ({ type }: { type: ElementType }) => (
    <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[9px] px-1.5 py-0.5 rounded lowercase font-medium">
        {type}
    </span>
);

export const CodeBlock = ({ label, code, color = 'text-slate-300' }: { label?: string, code: string, color?: string }) => (
    <div className="group relative rounded-md overflow-hidden border border-slate-800">
        {label && (
            <div className="bg-slate-800/50 px-3 py-1.5 border-b border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
                <Copy className="w-3 h-3 text-slate-600 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(code)} />
            </div>
        )}
        <pre className={`text-[12px] bg-[#0d1117] p-3 overflow-x-auto whitespace-pre-wrap ${color} leading-relaxed`} style={CODE_FONT_STYLE}>
            {code || '// vide'}
        </pre>
    </div>
);

// ==========================================
// 3. LOGIQUE D'AFFICHAGE & NAVIGATION
// ==========================================

const WordDiffHighlighter = ({ oldText, newText }: { oldText: string, newText: string }) => {
    const diffs = useMemo(() => {
        const t1 = tokenize(oldText);
        const t2 = tokenize(newText);
        return computeRawDiff(t1, t2);
    }, [oldText, newText]);

    const chunks = useMemo(() => {
        const result: { type: 'add'|'del'|'eq', content: string, oldContent?: string }[] = [];
        let bufferDel = "";
        let bufferAdd = "";
        
        const flushBuffers = () => {
            if (bufferDel && bufferAdd) {
                result.push({ type: 'add', content: bufferAdd, oldContent: bufferDel });
            } else {
                if (bufferDel) result.push({ type: 'del', content: bufferDel });
                if (bufferAdd) result.push({ type: 'add', content: bufferAdd });
            }
            bufferDel = "";
            bufferAdd = "";
        };

        for (let i = 0; i < diffs.length; i++) {
            const d = diffs[i];
            if (d.type === 'eq') {
                flushBuffers();
                result.push({ type: 'eq', content: d.content });
            } 
            else if (d.type === 'del') { bufferDel += d.content; } 
            else if (d.type === 'add') { bufferAdd += d.content; }
        }
        flushBuffers();
        return result;
    }, [diffs]);

    return (
        <span className="whitespace-pre-wrap break-all">
            {chunks.map((chunk, idx) => {
                if (chunk.type === 'eq') {
                    return <span key={idx} className="opacity-90">{highlightSyntax(chunk.content)}</span>;
                }
                
                if (chunk.type === 'add') {
                    if (chunk.oldContent) {
                        return (
                            <span key={idx} className="relative group/word inline-block align-top mx-0.5">
                                <span className="bg-blue-500/30 text-blue-100 border-b border-blue-400 rounded-sm px-0.5 cursor-help">
                                    {chunk.content}
                                </span>
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/word:block z-[999] w-max max-w-[400px] bg-slate-900 text-slate-200 text-sm px-3 py-2 rounded-md border border-slate-600 shadow-2xl">
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1 border-b border-slate-700 pb-1">Avant</div>
                                    <div className="text-red-300 line-through decoration-red-500/50 font-mono leading-relaxed">{chunk.oldContent}</div>
                                </span>
                            </span>
                        );
                    } else {
                        return (
                            <span key={idx} className="bg-green-500/20 text-green-300 font-bold px-0.5 rounded mx-0.5 border border-green-500/10">
                                {chunk.content}
                            </span>
                        );
                    }
                }

                if (chunk.type === 'del') {
                    return (
                        <span key={idx} className="bg-red-500/10 text-red-400 line-through px-0.5 rounded mx-0.5 opacity-60 decoration-red-500/40 border border-red-500/10">
                            {chunk.content}
                        </span>
                    );
                }
                
                return null;
            })}
        </span>
    );
};

const CollapseAction = ({ onClick }: { onClick: (e: React.MouseEvent) => void }) => (
    <div 
        onClick={onClick}
        className="h-6 bg-[#11161d] border-y border-slate-800/50 flex justify-center items-center cursor-pointer hover:bg-slate-800/80 transition-colors group/btn"
    >
        <div className="text-[10px] text-slate-500 flex items-center gap-1 group-hover/btn:text-blue-400">
            <Minimize2 className="w-3 h-3" /> Replier le contexte
        </div>
    </div>
);

const CollapsedContext = ({ lines }: { lines: ProcessedLine[] }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (lines.length === 0) return null;

    const handleCollapse = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(false);
    };

    if (isExpanded) {
        return (
            <div className="bg-[#0d1117] border-y border-slate-800/30">
                {lines.length > 5 && <CollapseAction onClick={handleCollapse} />}
                
                <div className="py-2">
                    {lines.map((line, idx) => (
                        <div key={idx} className="flex hover:bg-slate-800/30 transition-colors py-0.5 opacity-50 hover:opacity-100 group">
                            <div className="flex select-none mr-3 text-[10px] font-mono opacity-30 text-right shrink-0 border-r border-slate-800 pr-2 pt-0.5 gap-2 w-16 justify-end">
                                <span>{line.oldLineNo}</span>
                                <span>{line.newLineNo}</span>
                            </div>
                            <div className="w-4"></div>
                            <div className="flex-1 text-slate-400 whitespace-pre-wrap">
                                {highlightSyntax(line.content)}
                            </div>
                        </div>
                    ))}
                </div>

                {lines.length > 5 && <CollapseAction onClick={handleCollapse} />}
            </div>
        );
    }

    return (
        <div className="bg-[#11161d] py-1 border-y border-slate-800/50 flex justify-center group cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => setIsExpanded(true)}>
            <div className="flex items-center gap-2 text-xs text-slate-500 group-hover:text-blue-400 transition-colors py-1">
                <ChevronsUpDown className="w-4 h-4" />
                <span>Afficher {lines.length} lignes de contexte</span>
            </div>
        </div>
    );
};

export const MicroDiffViewer = ({ oldCode, newCode, startingLine = 1, id }: { oldCode: string, newCode: string, startingLine?: number, id?: string }) => {
    const [showOld, setShowOld] = useState(true);
    const [showNew, setShowNew] = useState(true);
    
    const randomId = useMemo(() => Math.random().toString(36).substr(2, 9), []);
    const viewerId = id || randomId;

    const allLines = useMemo(() => processSmartDiff(oldCode, newCode, startingLine), [oldCode, newCode, startingLine]);
    
    const chunks = useMemo(() => {
        const res: { isContext: boolean, lines: ProcessedLine[] }[] = [];
        let currentBuffer: ProcessedLine[] = [];
        let isContextBuffer = allLines[0]?.type === 'eq';

        allLines.forEach(line => {
            const lineIsContext = line.type === 'eq';
            if (lineIsContext !== isContextBuffer) {
                if (currentBuffer.length > 0) res.push({ isContext: isContextBuffer, lines: currentBuffer });
                currentBuffer = [line];
                isContextBuffer = lineIsContext;
            } else {
                currentBuffer.push(line);
            }
        });
        if (currentBuffer.length > 0) res.push({ isContext: isContextBuffer, lines: currentBuffer });
        return res;
    }, [allLines]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                
                const allNavigables = Array.from(document.querySelectorAll('[data-diff-line="true"]'));
                if (allNavigables.length === 0) return;

                const currentIndex = allNavigables.findIndex(el => el.classList.contains('active-diff-line'));
                
                let nextIndex = 0;
                if (currentIndex !== -1) {
                    if (e.key === 'ArrowDown') nextIndex = currentIndex + 1;
                    else nextIndex = currentIndex - 1;
                } else {
                    nextIndex = e.key === 'ArrowDown' ? 0 : allNavigables.length - 1;
                }

                if (nextIndex < 0) nextIndex = 0;
                if (nextIndex >= allNavigables.length) nextIndex = allNavigables.length - 1;

                const target = allNavigables[nextIndex] as HTMLElement;
                
                allNavigables.forEach(el => el.classList.remove('active-diff-line', 'bg-yellow-500/20', 'ring-1', 'ring-yellow-500/50'));
                target.classList.add('active-diff-line', 'bg-yellow-500/20', 'ring-1', 'ring-yellow-500/50');
                
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleCopyDebug = () => {
        navigator.clipboard.writeText(JSON.stringify(allLines, null, 2));
    };

    if (allLines.length === 0) return <div className="text-slate-500 italic text-xs py-1">Changements de formatage uniquement</div>;

    const LineNumbers = ({ oldNum, newNum, colorClass }: { oldNum?: number, newNum?: number, colorClass: string }) => (
        <div className="flex select-none mr-3 text-[10px] font-mono opacity-40 text-right shrink-0 border-r border-slate-800 pr-2 pt-0.5 gap-2 w-16 justify-end bg-[#0d1117]/50">
            <span className={oldNum ? "" : "opacity-0"}>{oldNum || '-'}</span>
            <span className={newNum ? colorClass : "opacity-0"}>{newNum || '-'}</span>
        </div>
    );

    const StatusIcon = ({ char, colorClass }: { char: string, colorClass: string }) => (
        <div className={`w-4 text-center select-none font-bold mr-1 opacity-80 shrink-0 ${colorClass}`}>
            {char}
        </div>
    );

    const triggerNav = (dir: number) => {
        const event = new KeyboardEvent('keydown', { key: dir === 1 ? 'ArrowDown' : 'ArrowUp' });
        window.dispatchEvent(event);
    };

    let globalLineIndex = 0;

    return (
        <div 
            className="mt-2 bg-[#0d1117] border border-slate-700 rounded-md overflow-hidden text-[13px] leading-6 group/viewer shadow-inner relative flex" 
            style={CODE_FONT_STYLE}
        >
            <div className="flex-1 overflow-x-auto py-2">
                {chunks.map((chunk, chunkIdx) => {
                    if (chunk.isContext) {
                        return <CollapsedContext key={chunkIdx} lines={chunk.lines} />;
                    }

                    return chunk.lines.map((line, idx) => {
                        const uniqueKey = `${viewerId}-${chunkIdx}-${idx}`;
                        const lineId = `${viewerId}-chunk-${globalLineIndex++}`;

                        if (line.type === 'modif') {
                            return (
                                <div 
                                    key={uniqueKey} 
                                    id={lineId}
                                    data-diff-line="true" 
                                    className="flex bg-blue-500/5 hover:bg-blue-500/10 transition-colors py-0.5 border-l-2 border-blue-500/40 group/line items-start rounded-r"
                                >
                                    <LineNumbers oldNum={line.oldLineNo} newNum={line.newLineNo} colorClass="text-blue-300 font-bold" />
                                    <StatusIcon char="~" colorClass="text-blue-400" />
                                    <div className="flex-1 text-slate-300">
                                        <WordDiffHighlighter oldText={line.oldContent || ''} newText={line.content} />
                                    </div>
                                </div>
                            );
                        }

                        if (line.type === 'add') {
                            if (!showNew) return null;
                            const isEmpty = !line.content.trim();
                            return (
                                <div 
                                    key={uniqueKey} 
                                    id={lineId}
                                    data-diff-line="true"
                                    className="flex bg-green-500/5 hover:bg-green-500/10 transition-colors py-0.5 border-l-2 border-green-500/40 items-start rounded-r"
                                >
                                    <LineNumbers newNum={line.newLineNo} colorClass="text-green-500" />
                                    <StatusIcon char="+" colorClass="text-green-500" />
                                    <div className="flex-1 text-green-300 whitespace-pre-wrap">
                                        {isEmpty ? <span className="opacity-20">·</span> : highlightSyntax(line.content)}
                                    </div>
                                </div>
                            );
                        }

                        if (line.type === 'del') {
                            if (!showOld) return null;
                            const isEmpty = !line.content.trim();
                            return (
                                <div 
                                    key={uniqueKey} 
                                    id={lineId}
                                    data-diff-line="true"
                                    className="flex bg-red-500/5 hover:bg-red-500/10 transition-colors py-0.5 border-l-2 border-red-500/40 items-start rounded-r"
                                >
                                    <LineNumbers oldNum={line.oldLineNo} colorClass="text-red-500" />
                                    <StatusIcon char="-" colorClass="text-red-500" />
                                    <div className="flex-1 text-red-400 line-through opacity-60 whitespace-pre-wrap decoration-red-500/30">
                                        {isEmpty ? <span className="opacity-20">·</span> : line.content}
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    });
                })}
            </div>

            <div className="w-10 border-l border-slate-700 bg-[#161b22] flex flex-col items-center py-2 gap-2 sticky top-[60px] h-fit self-start z-20 shadow-xl">
                <div className="flex flex-col gap-1 w-full px-1 pb-2 border-b border-slate-700">
                    <button onClick={() => triggerNav(-1)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                        <ArrowUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => triggerNav(1)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                        <ArrowDown className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-col gap-2 w-full px-1 py-2">
                    <button onClick={() => setShowOld(!showOld)} className={`p-1.5 rounded transition-colors flex flex-col items-center gap-1 ${showOld ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'text-slate-600 hover:bg-slate-800'}`}>
                        {showOld ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        <span className="text-[8px] font-bold uppercase">Avant</span>
                    </button>
                    <button onClick={() => setShowNew(!showNew)} className={`p-1.5 rounded transition-colors flex flex-col items-center gap-1 ${showNew ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'text-slate-600 hover:bg-slate-800'}`}>
                        {showNew ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        <span className="text-[8px] font-bold uppercase">Après</span>
                    </button>
                </div>

                <div className="mt-auto pt-2 border-t border-slate-700 w-full px-1">
                    <button onClick={handleCopyDebug} className="w-full p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition-colors flex justify-center">
                        <Copy className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};