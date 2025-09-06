import { ProseMirrorDocument, ProseMirrorNode, DocumentAnalysis, NodeInfo } from './types';

export class ProseMirrorAnalyzer {
  static analyzeDocument(doc: ProseMirrorDocument): DocumentAnalysis {
    const analysis: DocumentAnalysis = {
      nodeMap: new Map(),
      textPositions: [],
      blockStructure: []
    };

    this.traverseNode(doc, [], 0, analysis);
    return analysis;
  }

  private static traverseNode(
    node: ProseMirrorNode | ProseMirrorDocument,
    path: number[],
    textOffset: number,
    analysis: DocumentAnalysis
  ): number {
    const nodeInfo: NodeInfo = {
      type: node.type,
      path: [...path],
      textOffset,
      textLength: 0,
      children: []
    };
    
    if ('attrs' in node && node.attrs) {
      nodeInfo.attrs = node.attrs;
    }

    if ('text' in node && node.text) {
      nodeInfo.textLength = node.text.length;
      analysis.textPositions.push({
        path: [...path],
        start: textOffset,
        end: textOffset + node.text.length,
        text: node.text
      });
      textOffset += node.text.length;
    } else if ('content' in node && node.content) {
      let childOffset = textOffset;
      node.content.forEach((child, index) => {
        const childPath = [...path, index];
        childOffset = this.traverseNode(child, childPath, childOffset, analysis);
        nodeInfo.children.push(childPath);
      });
      nodeInfo.textLength = childOffset - textOffset;
      textOffset = childOffset;
    }

    analysis.nodeMap.set(path.join('.'), nodeInfo);

    if (['paragraph', 'heading', 'list_item', 'code_block', 'blockquote'].includes(node.type)) {
      analysis.blockStructure.push(nodeInfo);
    }

    return textOffset;
  }

  static findNodeAtPath(doc: ProseMirrorDocument, path: number[]): ProseMirrorNode | null {
    let current: ProseMirrorNode | ProseMirrorDocument = doc;

    for (const index of path) {
      if ('content' in current && current.content && current.content[index]) {
        current = current.content[index];
      } else {
        return null;
      }
    }

    return current as ProseMirrorNode;
  }

  static getTextAtOffset(analysis: DocumentAnalysis, offset: number): {
    node: NodeInfo | null;
    localOffset: number;
  } {
    for (const textPos of analysis.textPositions) {
      if (offset >= textPos.start && offset < textPos.end) {
        const nodeKey = textPos.path.join('.');
        const node = analysis.nodeMap.get(nodeKey);
        return {
          node: node || null,
          localOffset: offset - textPos.start
        };
      }
    }

    return {
      node: null,
      localOffset: 0
    };
  }

  static findBlockContainingOffset(analysis: DocumentAnalysis, offset: number): NodeInfo | null {
    for (const block of analysis.blockStructure) {
      if (offset >= block.textOffset && offset < block.textOffset + block.textLength) {
        return block;
      }
    }
    return null;
  }

  static getPathDepth(path: number[]): number {
    return path.length;
  }

  static isPathDescendantOf(childPath: number[], parentPath: number[]): boolean {
    if (childPath.length <= parentPath.length) {
      return false;
    }

    for (let i = 0; i < parentPath.length; i++) {
      if (childPath[i] !== parentPath[i]) {
        return false;
      }
    }

    return true;
  }

  static findCommonAncestorPath(path1: number[], path2: number[]): number[] {
    const commonPath: number[] = [];
    const minLength = Math.min(path1.length, path2.length);

    for (let i = 0; i < minLength; i++) {
      const val1 = path1[i];
      const val2 = path2[i];
      if (val1 !== undefined && val2 !== undefined && val1 === val2) {
        commonPath.push(val1);
      } else {
        break;
      }
    }

    return commonPath;
  }

  static calculateTextLength(doc: ProseMirrorDocument): number {
    return this.calculateNodeTextLength(doc);
  }

  private static calculateNodeTextLength(node: ProseMirrorNode | ProseMirrorDocument): number {
    if ('text' in node && node.text) {
      return node.text.length;
    }

    if ('content' in node && node.content) {
      return node.content.reduce((total, child) => {
        return total + this.calculateNodeTextLength(child);
      }, 0);
    }

    return 0;
  }
}