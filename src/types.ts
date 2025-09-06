export interface ProseMirrorNode {
  type: string;
  attrs?: Record<string, any>;
  content?: ProseMirrorNode[];
  text?: string;
  marks?: Array<{
    type: string;
    attrs?: Record<string, any>;
  }>;
}

export interface ProseMirrorDocument {
  type: 'doc';
  content: ProseMirrorNode[];
}

export interface MarkdownDiffOperation {
  type: 'insert' | 'delete' | 'replace' | 'modify_node' | 'insert_node' | 'delete_node';
  markdownPosition: number;
  prosemirrorPath?: number[];
  length?: number;
  content?: string;
  originalContent?: string;
  nodeType?: string;
  nodeAttrs?: Record<string, any>;
}

export interface TransformResult {
  success: boolean;
  newDocument: ProseMirrorDocument;
  operations: MarkdownDiffOperation[];
  errors: string[];
  statistics: {
    nodesModified: number;
    textChanges: number;
    structuralChanges: number;
  };
}

export interface MarkdownBlock {
  type: string;
  content: string[];
  startLine: number;
  endLine: number;
  level?: number;
  attrs?: Record<string, any>;
}

export interface DocumentAnalysis {
  nodeMap: Map<string, NodeInfo>;
  textPositions: Array<{
    path: number[];
    start: number;
    end: number;
    text: string;
  }>;
  blockStructure: NodeInfo[];
}

export interface NodeInfo {
  type: string;
  path: number[];
  textOffset: number;
  textLength: number;
  attrs?: Record<string, any>;
  children: number[][];
}

export interface BlockDiffOperation {
  type: 'insert_block' | 'delete_block' | 'modify_block' | 'replace_block';
  position: number;
  originalBlock?: MarkdownBlock;
  newBlock?: MarkdownBlock;
  contentChanges?: ContentChange[];
}

export interface ContentChange {
  type: 'text_change';
  position: number;
  length: number;
  oldText: string;
  newText: string;
}

export interface TransformOptions {
  preserveFormatting?: boolean;
  handleStructuralChanges?: boolean;
  granularity?: 'block' | 'line' | 'character';
}

// Additional types for converter
export interface MarkdownDiff {
  additions: string[];
  deletions: string[];
  modifications: Array<{
    oldContent: string;
    newContent: string;
    position: number;
  }>;
}

export interface ConversionOptions {
  preserveWhitespace?: boolean;
  ignoreCase?: boolean;
}

export interface MarkdownDiffConverter {
  convert(diff: MarkdownDiff, options?: ConversionOptions): any;
}