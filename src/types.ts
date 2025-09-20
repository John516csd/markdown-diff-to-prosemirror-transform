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

/**
 * 自定义节点转换器函数类型
 * 用于将自定义的 ProseMirror 节点转换为 Markdown 字符串
 */
export type CustomNodeConverter = (node: ProseMirrorNode) => string;

/**
 * 自定义节点转换器配置
 * 键为节点类型，值为对应的转换函数
 */
export interface CustomNodeConverters {
  [nodeType: string]: CustomNodeConverter;
}

/**
 * 序列化选项
 */
export interface SerializeOptions {
  customConverters?: CustomNodeConverters;
  fallbackToParagraph?: boolean; // 当没有自定义转换器时是否回退到段落
  includeUnknownNodes?: boolean; // 是否包含未知节点的信息
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