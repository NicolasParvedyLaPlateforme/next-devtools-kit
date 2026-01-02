export interface SourceLoc { start: number; end: number; lines: number; }
export interface DocTag { name: string; text?: string; }
export interface JSDocData { description: string; tags: DocTag[]; }
export interface AstProperty { name: string; type?: string; visibility?: string; readonly?: boolean; optional?: boolean; docs?: JSDocData[]; loc?: SourceLoc; }
export interface AstMethod { name: string; visibility?: string; returnType?: string; params?: string[]; docs?: JSDocData[]; loc?: SourceLoc; }
export interface ImportItem { module: string; default?: string | null; named: { name: string; alias?: string | null }[]; text: string; loc: SourceLoc; }
export interface ExportItem { module?: string; named: string[]; loc: SourceLoc; }
export interface VariableData { name: string; kind?: string; type: string; value?: string; hash?: string; modifiers?: string[]; docs?: JSDocData[]; loc?: SourceLoc; }
export interface FunctionData { name: string; signature: string; returnType: string; params: { name: string; type: string; initializer?: string | null }[]; variables: VariableData[]; modifiers?: string[]; docs?: JSDocData[]; jsxReturn?: string | null; bodyHash?: string; fullText?: string; loc?: SourceLoc; }
export interface TypeData { kind: 'TypeAlias' | 'Interface'; name: string; value?: string; properties?: AstProperty[]; methods?: AstMethod[]; extends?: string[]; hash: string; modifiers?: string[]; docs?: JSDocData[]; loc?: SourceLoc; }
export interface ClassData { name: string; extends?: string | null; implements?: string[]; modifiers?: string[]; decorators?: string[]; docs?: JSDocData[]; properties: AstProperty[]; methods: AstMethod[]; loc?: SourceLoc; }
export interface EnumData { name: string; members: { name: string; value?: string | number | null }[]; modifiers?: string[]; loc?: SourceLoc; }
export interface FileStructure { imports: ImportItem[]; exports: ExportItem[]; classes: ClassData[]; enums: EnumData[]; types: TypeData[]; interfaces: TypeData[]; variables: VariableData[]; functions: FunctionData[]; }
export interface FileData { meta: { filePath: string; fileName: string; loc: { lines: number } }; stats: { classes: number; functions: number; variables: number; types: number }; structure: FileStructure; }
export type ChangeType = 'MODIF' | 'AJOUT' | 'SUPPRESSION' | 'DEPLACEMENT';
export type ElementType = 'VARIABLE' | 'FONCTION' | 'TYPE' | 'LOGIQUE' | 'IMPORT' | 'CLASS';
export interface ChangeDetail { id: string; label: string; elementType: ElementType; parentScope?: string; oldVal?: string; newVal?: string; type: ChangeType; isBlockCode?: boolean; oldLineNo?: number; newLineNo?: number; }
export interface FileDiff { file: string; status: 'MODIFIÉ' | 'NOUVEAU' | 'SUPPRIMÉ'; changes: ChangeDetail[]; }