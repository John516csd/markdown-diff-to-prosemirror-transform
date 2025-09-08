import { 
  MarkdownBlock, 
  ProseMirrorDocument, 
  ProseMirrorNode,
  DocumentAnalysis, 
  BlockDiffOperation, 
  ContentChange, 
  MarkdownDiffOperation, 
  TransformResult,
  TransformOptions
} from './types';
import { MarkdownParser } from './parser';
import { ProseMirrorAnalyzer } from './analyzer';
import { ImprovedPositionMapper } from './position-mapper';

export class MarkdownToProseMirrorMapper {
  static async transform(
    originalMarkdown: string,
    modifiedMarkdown: string,
    originalProseMirrorDoc: ProseMirrorDocument,
    options: TransformOptions = {}
  ): Promise<TransformResult> {
    const {
      preserveFormatting = true,
      handleStructuralChanges = true,
      granularity = 'block'
    } = options;

    try {
      const originalBlocks = MarkdownParser.parseToBlocks(originalMarkdown);
      const modifiedBlocks = MarkdownParser.parseToBlocks(modifiedMarkdown);

      const docAnalysis = ProseMirrorAnalyzer.analyzeDocument(originalProseMirrorDoc);

      const blockDiff = this.computeBlockDiff(originalBlocks, modifiedBlocks);

      // 使用改进的位置映射算法
      const improvedBlockMapping = ImprovedPositionMapper.buildBlockMapping(originalBlocks, originalProseMirrorDoc);
      console.log('🔥 改进的块级映射:', improvedBlockMapping);

      const mappedOperations = await this.mapDiffToProseMirror(
        blockDiff,
        docAnalysis,
        originalMarkdown,
        modifiedMarkdown,
        improvedBlockMapping
      );
      console.log("🚀 ~ MarkdownToProseMirrorMapper ~ transform ~ mappedOperations:", mappedOperations)

      const newDocument = this.applyOperationsToDocument(
        originalProseMirrorDoc,
        mappedOperations,
        { preserveFormatting }
      );

      return {
        success: true,
        newDocument,
        operations: mappedOperations,
        errors: [],
        statistics: this.calculateStatistics(mappedOperations)
      };

    } catch (error) {
      return {
        success: false,
        newDocument: originalProseMirrorDoc,
        operations: [],
        errors: [error instanceof Error ? error.message : String(error)],
        statistics: { nodesModified: 0, textChanges: 0, structuralChanges: 0 }
      };
    }
  }

  private static computeBlockDiff(
    originalBlocks: MarkdownBlock[],
    modifiedBlocks: MarkdownBlock[]
  ): BlockDiffOperation[] {
    const operations: BlockDiffOperation[] = [];
    let i = 0, j = 0;

    while (i < originalBlocks.length || j < modifiedBlocks.length) {
      if (i >= originalBlocks.length) {
        const newBlock = modifiedBlocks[j];
        if (newBlock) {
          operations.push({
            type: 'insert_block',
            position: i,
            newBlock
          });
        }
        j++;
      } else if (j >= modifiedBlocks.length) {
        const originalBlock = originalBlocks[i];
        if (originalBlock) {
          operations.push({
            type: 'delete_block',
            position: i,
            originalBlock
          });
        }
        i++;
      } else {
        const originalBlock = originalBlocks[i];
        const modifiedBlock = modifiedBlocks[j];
        
        if (originalBlock && modifiedBlock && this.blocksEqual(originalBlock, modifiedBlock)) {
          i++;
          j++;
        } else if (originalBlock && modifiedBlock && originalBlock.type === modifiedBlock.type) {
          const contentDiff = this.computeBlockContentDiff(
            originalBlock,
            modifiedBlock
          );
          
          if (contentDiff.length > 0) {
            operations.push({
              type: 'modify_block',
              position: i,
              originalBlock,
              newBlock: modifiedBlock,
              contentChanges: contentDiff
            });
          }
          i++;
          j++;
        } else if (originalBlock && modifiedBlock) {
          operations.push({
            type: 'replace_block',
            position: i,
            originalBlock,
            newBlock: modifiedBlock
          });
          i++;
          j++;
        } else {
          // Skip if either block is undefined
          if (!originalBlock) j++;
          if (!modifiedBlock) i++;
        }
      }
    }

    return operations;
  }

  private static computeBlockContentDiff(
    originalBlock: MarkdownBlock, 
    modifiedBlock: MarkdownBlock
  ): ContentChange[] {
    const originalContent = originalBlock.content.join('\n');
    const modifiedContent = modifiedBlock.content.join('\n');
    
    if (originalContent === modifiedContent) {
      return [];
    }

    return [{
      type: 'text_change',
      position: 0,
      length: originalContent.length,
      oldText: originalContent,
      newText: modifiedContent
    }];
  }

  private static async mapDiffToProseMirror(
    blockDiff: BlockDiffOperation[],
    docAnalysis: DocumentAnalysis,
    originalMarkdown: string,
    modifiedMarkdown: string,
    improvedBlockMapping?: Map<number, any>
  ): Promise<MarkdownDiffOperation[]> {
    const operations: MarkdownDiffOperation[] = [];

    for (const diff of blockDiff) {
      switch (diff.type) {
        case 'insert_block':
          if (diff.newBlock) {
            const operation: MarkdownDiffOperation = {
              type: 'insert_node',
              markdownPosition: this.calculateMarkdownPosition(diff.newBlock, originalMarkdown),
              prosemirrorPath: [diff.position],
              nodeType: this.mapBlockTypeToProseMirror(diff.newBlock.type),
              content: diff.newBlock.content.join('\n')
            };
            if (diff.newBlock.attrs) {
              operation.nodeAttrs = diff.newBlock.attrs;
            }
            operations.push(operation);
          }
          break;

        case 'delete_block':
          const blockInfo = docAnalysis.blockStructure[diff.position];
          if (blockInfo && diff.originalBlock) {
            operations.push({
              type: 'delete_node',
              markdownPosition: this.calculateMarkdownPosition(diff.originalBlock, originalMarkdown),
              prosemirrorPath: blockInfo.path,
              nodeType: blockInfo.type
            });
          }
          break;

        case 'modify_block':
          // 优先使用改进的映射，回退到原有逻辑
          const modifyBlockInfo = improvedBlockMapping?.get(diff.position) || docAnalysis.blockStructure[diff.position];
          console.log('🔧 modify_block 使用映射:', improvedBlockMapping?.get(diff.position) ? '改进映射' : '原有映射');
          console.log('🔧 modify_block 映射信息:', modifyBlockInfo);
          
          if (modifyBlockInfo && diff.newBlock) {
            // 对于块级修改，直接替换整个块的内容
            operations.push({
              type: 'modify_node' as const,
              markdownPosition: this.calculateMarkdownPosition(diff.originalBlock || diff.newBlock, originalMarkdown),
              prosemirrorPath: modifyBlockInfo.path,
              nodeType: modifyBlockInfo.type,
              ...(diff.newBlock.attrs && { nodeAttrs: diff.newBlock.attrs }),
              content: diff.newBlock.content.join('')
            });
          }
          break;

        case 'replace_block':
          const replaceBlockInfo = docAnalysis.blockStructure[diff.position];
          if (replaceBlockInfo && diff.originalBlock && diff.newBlock) {
            operations.push({
              type: 'delete_node',
              markdownPosition: this.calculateMarkdownPosition(diff.originalBlock, originalMarkdown),
              prosemirrorPath: replaceBlockInfo.path,
              nodeType: replaceBlockInfo.type
            });
            
            const insertOperation: MarkdownDiffOperation = {
              type: 'insert_node',
              markdownPosition: this.calculateMarkdownPosition(diff.newBlock, modifiedMarkdown),
              prosemirrorPath: [diff.position],
              nodeType: this.mapBlockTypeToProseMirror(diff.newBlock.type),
              content: diff.newBlock.content.join('\n')
            };
            if (diff.newBlock.attrs) {
              insertOperation.nodeAttrs = diff.newBlock.attrs;
            }
            operations.push(insertOperation);
          }
          break;
      }
    }

    return operations;
  }

  private static applyOperationsToDocument(
    originalDoc: ProseMirrorDocument,
    operations: MarkdownDiffOperation[],
    options: { preserveFormatting?: boolean }
  ): ProseMirrorDocument {
    const newDoc: ProseMirrorDocument = JSON.parse(JSON.stringify(originalDoc));

    const sortedOps = [...operations].sort((a, b) => {
      const pathA = a.prosemirrorPath || [];
      const pathB = b.prosemirrorPath || [];
      
      if (pathA.length !== pathB.length) {
        return pathB.length - pathA.length;
      }
      
      for (let i = pathA.length - 1; i >= 0; i--) {
        const valA = pathA[i];
        const valB = pathB[i];
        if (valA !== undefined && valB !== undefined && valA !== valB) {
          return valB - valA;
        }
      }
      
      return 0;
    });

    for (const op of sortedOps) {
      try {
        this.applyOperation(newDoc, op, options);
      } catch (error) {
        console.warn('Failed to apply operation:', op, error);
      }
    }

    return newDoc;
  }

  private static applyOperation(
    doc: ProseMirrorDocument,
    operation: MarkdownDiffOperation,
    options: { preserveFormatting?: boolean }
  ): void {
    const path = operation.prosemirrorPath || [];
    
    switch (operation.type) {
      case 'insert_node':
        this.insertNode(doc, path, operation);
        break;
      
      case 'delete_node':
        this.deleteNode(doc, path);
        break;
      
      case 'replace':
        this.replaceTextContent(doc, path, operation);
        break;
      
      case 'modify_node':
        this.modifyNode(doc, path, operation);
        break;
    }
  }

  private static insertNode(doc: ProseMirrorDocument, path: number[], operation: MarkdownDiffOperation): void {
    const parent = this.getNodeAtPath(doc, path.slice(0, -1)) as ProseMirrorNode | ProseMirrorDocument;
    const index = path[path.length - 1] || 0;
    
    if ('content' in parent && parent.content) {
      const newNode: ProseMirrorNode = {
        type: operation.nodeType || 'paragraph',
        ...(operation.nodeAttrs && { attrs: operation.nodeAttrs }),
        content: operation.content ? this.parseContentToNodes(operation.content) : []
      };
      
      parent.content.splice(index, 0, newNode);
    }
  }

  private static deleteNode(doc: ProseMirrorDocument, path: number[]): void {
    if (path.length === 0) return;
    
    const parent = this.getNodeAtPath(doc, path.slice(0, -1)) as ProseMirrorNode | ProseMirrorDocument;
    const index = path[path.length - 1];
    
    if ('content' in parent && parent.content && index !== undefined && index < parent.content.length) {
      parent.content.splice(index, 1);
    }
  }

  private static replaceTextContent(doc: ProseMirrorDocument, path: number[], operation: MarkdownDiffOperation): void {
    const node = this.getNodeAtPath(doc, path) as ProseMirrorNode;
    
    if (node && 'content' in node && node.content) {
      node.content = this.parseContentToNodes(operation.content || '');
    }
  }

  private static modifyNode(doc: ProseMirrorDocument, path: number[], operation: MarkdownDiffOperation): void {
    const node = this.getNodeAtPath(doc, path) as ProseMirrorNode;
    
    if (node) {
      // 更新节点属性
      if (operation.nodeAttrs) {
        node.attrs = { ...node.attrs, ...operation.nodeAttrs };
      }
      
      // 更新节点内容
      if (operation.content !== undefined) {
        node.content = this.parseContentToNodes(operation.content);
      }
    }
  }

  private static getNodeAtPath(doc: ProseMirrorDocument, path: number[]): ProseMirrorNode | ProseMirrorDocument {
    let current: ProseMirrorNode | ProseMirrorDocument = doc;
    
    for (const index of path) {
      if ('content' in current && current.content && current.content[index]) {
        current = current.content[index];
      } else {
        throw new Error(`Invalid path: ${path.join('.')}`);
      }
    }
    
    return current;
  }

  private static parseContentToNodes(text: string): ProseMirrorNode[] {
    if (!text.trim()) {
      return [];
    }
    
    const inlineTokens = MarkdownParser.parseInlineMarkdown(text);
    return inlineTokens.map(token => ({
      type: token.type,
      ...(token.text && { text: token.text }),
      ...(token.marks && token.marks.length > 0 && { marks: token.marks })
    }));
  }

  private static blocksEqual(block1: MarkdownBlock, block2: MarkdownBlock): boolean {
    return block1.type === block2.type && 
           JSON.stringify(block1.content) === JSON.stringify(block2.content) &&
           JSON.stringify(block1.attrs) === JSON.stringify(block2.attrs);
  }

  private static calculateMarkdownPosition(block: MarkdownBlock, markdown: string): number {
    const lines = markdown.split('\n');
    let position = 0;
    
    for (let i = 0; i < block.startLine && i < lines.length; i++) {
      const line = lines[i];
      if (line !== undefined) {
        position += line.length + 1;
      }
    }
    
    return position;
  }

  private static mapBlockTypeToProseMirror(markdownType: string): string {
    const typeMap: Record<string, string> = {
      'heading': 'heading',
      'paragraph': 'paragraph',
      'list_item': 'list_item',
      'code_block': 'code_block',
      'blockquote': 'blockquote',
      'horizontal_rule': 'horizontal_rule'
    };
    
    return typeMap[markdownType] || 'paragraph';
  }

  private static calculateStatistics(operations: MarkdownDiffOperation[]) {
    return operations.reduce((stats, op) => {
      switch (op.type) {
        case 'insert_node':
        case 'delete_node':
        case 'modify_node':
          stats.nodesModified++;
          stats.structuralChanges++;
          break;
        case 'replace':
        case 'insert':
        case 'delete':
          stats.textChanges++;
          break;
      }
      return stats;
    }, { nodesModified: 0, textChanges: 0, structuralChanges: 0 });
  }
}