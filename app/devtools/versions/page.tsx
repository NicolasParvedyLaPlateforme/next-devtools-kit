"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ArrowRightLeft, ArrowRight, Copy, RefreshCw, Trash2 } from 'lucide-react';
import { FileDiff } from './types';
import VersionComparator from './VersionComparator';
import VersionExplorer from './VersionExplorer';

export default function VersionAuditPage() {
  const [versions, setVersions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'COMPARE' | 'EXPLORE'>('COMPARE');
  const [vOld, setVOld] = useState('');
  const [vNew, setVNew] = useState('');
  const [filesOld, setFilesOld] = useState<string[]>([]);
  const [filesNew, setFilesNew] = useState<string[]>([]);
  const [lastComparisons, setLastComparisons] = useState<FileDiff[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isMounted = useRef(false);

  useEffect(() => {
      let interval: NodeJS.Timeout;
      if (vNew === 'version_current') {
          interval = setInterval(() => {
              fetch(`/api/devtools/versions?version=version_current`)
                  .then(r => r.json())
                  .then(data => {
                      setFilesNew(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
                      setFilesNew(d => [...d]);
                  });
          }, 600000);
      }
      return () => clearInterval(interval);
  }, [vNew]);

  const loadVersions = useCallback(async (autoSelectNewest = false) => {
    try {
        const r = await fetch('/api/devtools/versions');
        const data = await r.json();
        setVersions(data);
        if (data.length === 0) { setVOld(''); setVNew(''); return; }
        if (autoSelectNewest) { setVNew(data[0]); if (data.length >= 2) setVOld(data[1]); return; }
        setVNew(current => {
            if (!current || !data.includes(current)) {
                if (data.length >= 2) setVOld(data[1]);
                return data[0];
            }
            return current;
        });
    } catch (err) { console.error("Error loading versions", err); }
  }, []);

  useEffect(() => {
    if (!isMounted.current) { loadVersions(); isMounted.current = true; }
  }, [loadVersions]);

  useEffect(() => {
    if(vOld) fetch(`/api/devtools/versions?version=${vOld}`).then(r => r.json()).then(setFilesOld);
    else setFilesOld([]);
    if(vNew) fetch(`/api/devtools/versions?version=${vNew}`).then(r => r.json()).then(setFilesNew);
    else setFilesNew([]);
  }, [vOld, vNew]);

  const handleRunAnalysis = async () => {
      setIsAnalyzing(true);
      try {
          const res = await fetch('/api/devtools/analyze', { method: 'POST' });
          const json = await res.json();
          if (json.success) await loadVersions(true);
          else alert("Error analysis: " + json.error);
      } catch (e) { alert("Network error"); } 
      finally { setIsAnalyzing(false); }
  };

  const handleDeleteVersion = async () => {
      if (!vNew) return;
      if (window.confirm(`Delete version ${vNew}?`)) {
          setIsDeleting(true);
          try {
              const res = await fetch(`/api/devtools/versions?version=${vNew}`, { method: 'DELETE' });
              const json = await res.json();
              if (json.success) await loadVersions();
              else alert("Delete failed: " + json.error);
          } catch (e) { alert("Network error"); } 
          finally { setIsDeleting(false); }
      }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-slate-300 font-sans text-sm selection:bg-purple-900 selection:text-white">
        <div className="h-16 border-b border-[#30363d] bg-[#161b22] px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-white font-bold text-lg tracking-tight">
                    <div className="bg-purple-600 p-1.5 rounded-lg"><Search className="w-4 h-4 text-white" /></div>
                    Project Audit
                </div>
                <button onClick={handleRunAnalysis} disabled={isAnalyzing} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold border border-[#30363d] transition-all ${isAnalyzing ? 'bg-purple-900/20 text-purple-300' : 'bg-[#21262d] text-slate-300 hover:text-white'}`}>
                    <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    {isAnalyzing ? 'Analyzing...' : 'New Snapshot'}
                </button>
                <div className="h-6 w-px bg-[#30363d] mx-2" />
                <div className="flex bg-[#0d1117] rounded-lg p-1 border border-[#30363d]">
                    <button onClick={() => setActiveTab('COMPARE')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'COMPARE' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}><ArrowRightLeft className="w-3 h-3" /> Compare</button>
                    <button onClick={() => setActiveTab('EXPLORE')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'EXPLORE' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}><Search className="w-3 h-3" /> Explore</button>
                </div>
            </div>
            
            <div className="flex items-center gap-3 bg-[#0d1117] p-1.5 rounded-lg border border-[#30363d]">
                {activeTab === 'COMPARE' ? (
                    <>
                        <div className="flex items-center gap-2 px-2">
                             <span className="text-slate-500 text-[10px] uppercase font-bold">From</span>
                             <select value={vOld} onChange={e => setVOld(e.target.value)} className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer">
                                {versions.map(v => <option key={v} value={v}>{v.replace('version_','')}</option>)}
                             </select>
                        </div>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <div className="flex items-center gap-2 px-2 border-r border-[#30363d] pr-4 mr-2">
                             <span className="text-slate-500 text-[10px] uppercase font-bold">To</span>
                             <select value={vNew} onChange={e => setVNew(e.target.value)} className="bg-transparent text-xs text-green-400 font-bold outline-none cursor-pointer">
                                {versions.map(v => <option key={v} value={v}>{v.replace('version_','')}</option>)}
                             </select>
                             {vNew && (
                                <button onClick={handleDeleteVersion} disabled={isDeleting} className="ml-2 p-1.5 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400">
                                    <Trash2 className={`w-3.5 h-3.5 ${isDeleting ? 'animate-pulse' : ''}`} />
                                </button>
                             )}
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-2 px-2">
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Version</span>
                        <select value={vNew} onChange={e => setVNew(e.target.value)} className="bg-transparent text-xs text-purple-400 font-bold outline-none cursor-pointer w-40">
                            {versions.map(v => <option key={v} value={v}>{v.replace('version_','')}</option>)}
                        </select>
                    </div>
                )}
            </div>
        </div>

        <div className="flex-1 overflow-hidden flex relative bg-[#0d1117]">
            {activeTab === 'COMPARE' ? (
                <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                    <VersionComparator vOld={vOld} vNew={vNew} filesOld={filesOld} filesNew={filesNew} onComparisonComplete={setLastComparisons} />
                </div>
            ) : (
                <VersionExplorer version={vNew} files={filesNew} />
            )}
        </div>
    </div>
  );
}