import { ProseMirrorDocument, ProseMirrorNode, DocumentAnalysis, NodeInfo, MarkdownBlock } from './types';
import { MarkdownParser } from './parser';

/**
 * 改进的位置映射算法
 * 解决 Markdown 块索引与 ProseMirror 节点路径的精确映射问题
 */
export class ImprovedPositionMapper {
  /**
   * 建立 Markdown 块与 ProseMirror 节点的精确映射
   */
  static buildBlockMapping(
    markdownBlocks: MarkdownBlock[],
    proseMirrorDoc: ProseMirrorDocument
  ): Map<number, NodeInfo> {
    console.log('🔄 开始构建改进的块级映射...');
    
    // 1. 分析 ProseMirror 文档结构
    const analysis = this.analyzeDocumentStructure(proseMirrorDoc);
    console.log('📊 文档分析结果:', analysis);
    
    // 2. 提取有序的块级节点
    const blockNodes = this.extractOrderedBlockNodes(analysis);
    console.log('📦 提取的块级节点:', blockNodes);
    
    // 3. 为每个块级节点提取实际文本内容
    const enrichedBlockNodes = this.enrichNodesWithContent(blockNodes, proseMirrorDoc);
    console.log('📝 富化的块级节点:', enrichedBlockNodes);
    
    // 4. 建立索引映射
    const mapping = this.alignBlocksWithContent(markdownBlocks, enrichedBlockNodes);
    console.log('🔗 建立的块级映射:', mapping);
    
    return mapping;
  }

  /**
   * 分析 ProseMirror 文档结构
   */
  private static analyzeDocumentStructure(doc: ProseMirrorDocument): DocumentAnalysis {
    const analysis: DocumentAnalysis = {
      nodeMap: new Map(),
      textPositions: [],
      blockStructure: []
    };

    this.traverseDocumentStructure(doc, [], 0, analysis);
    return analysis;
  }

  /**
   * 遍历文档结构，保持顺序
   */
  private static traverseDocumentStructure(
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
      // 文本节点
      nodeInfo.textLength = node.text.length;
      analysis.textPositions.push({
        path: [...path],
        start: textOffset,
        end: textOffset + node.text.length,
        text: node.text
      });
      textOffset += node.text.length;
    } else if ('content' in node && node.content) {
      // 容器节点
      let childOffset = textOffset;
      node.content.forEach((child, index) => {
        const childPath = [...path, index];
        childOffset = this.traverseDocumentStructure(child, childPath, childOffset, analysis);
        nodeInfo.children.push(childPath);
      });
      nodeInfo.textLength = childOffset - textOffset;
      textOffset = childOffset;
    }

    analysis.nodeMap.set(path.join('.'), nodeInfo);

    // 只有顶级块才加入 blockStructure
    if (path.length === 1 && this.isBlockLevelNode(node.type)) {
      analysis.blockStructure.push(nodeInfo);
    }

    return textOffset;
  }

  /**
   * 判断是否为块级节点
   */
  private static isBlockLevelNode(nodeType: string): boolean {
    return ['paragraph', 'heading', 'list_item', 'code_block', 'blockquote', 'bullet_list', 'ordered_list'].includes(nodeType);
  }

  /**
   * 提取有序的块级节点
   */
  private static extractOrderedBlockNodes(analysis: DocumentAnalysis): NodeInfo[] {
    // 按照路径顺序排序，确保与文档出现顺序一致
    return analysis.blockStructure.sort((a, b) => {
      // 比较路径的第一个元素（顶级索引）
      const pathA = a.path[0] || 0;
      const pathB = b.path[0] || 0;
      return pathA - pathB;
    });
  }

  /**
   * 为节点信息补充实际文本内容
   */
  private static enrichNodesWithContent(
    blockNodes: NodeInfo[],
    proseMirrorDoc: ProseMirrorDocument
  ): (NodeInfo & { actualContent: string })[] {
    return blockNodes.map(node => ({
      ...node,
      actualContent: this.extractActualTextFromNode(node.path, proseMirrorDoc)
    }));
  }

  /**
   * 从 ProseMirror 文档中提取指定路径节点的实际文本内容
   */
  private static extractActualTextFromNode(path: number[], doc: ProseMirrorDocument): string {
    try {
      let current: any = doc;
      
      // 沿着路径导航到目标节点
      for (const index of path) {
        if (current.content && current.content[index]) {
          current = current.content[index];
        } else {
          return '';
        }
      }
      
      // 递归提取文本内容
      return this.extractTextRecursively(current);
    } catch (error) {
      console.warn('提取文本内容失败:', error);
      return '';
    }
  }

  /**
   * 递归提取节点的文本内容
   */
  private static extractTextRecursively(node: any): string {
    if (node.text) {
      return node.text;
    }
    
    if (node.content && Array.isArray(node.content)) {
      return node.content.map((child: any) => this.extractTextRecursively(child)).join('');
    }
    
    return '';
  }

  /**
   * 基于内容相似度的块级对齐
   */
  private static alignBlocksWithContent(
    markdownBlocks: MarkdownBlock[],
    proseMirrorBlocks: (NodeInfo & { actualContent: string })[]
  ): Map<number, NodeInfo> {
    const mapping = new Map<number, NodeInfo>();
    
    console.log('🎯 开始内容对齐...');
    console.log(`Markdown 块数量: ${markdownBlocks.length}`);
    console.log(`ProseMirror 块数量: ${proseMirrorBlocks.length}`);

    // 基本假设：如果数量相等，按顺序对应
    if (markdownBlocks.length === proseMirrorBlocks.length) {
      console.log('✅ 块数量相等，使用顺序映射');
      for (let i = 0; i < markdownBlocks.length; i++) {
        const mdBlock = markdownBlocks[i];
        const pmBlock = proseMirrorBlocks[i];
        if (mdBlock && pmBlock) {
          mapping.set(i, pmBlock);
          console.log(`映射 ${i}: MD[${mdBlock.type}] → PM[${pmBlock.type}] path[${pmBlock.path.join('.')}]`);
        }
      }
      return mapping;
    }

    // 数量不等时，使用内容相似度匹配
    console.log('⚠️ 块数量不等，使用相似度匹配');
    const used = new Set<number>();
    
    for (let mdIndex = 0; mdIndex < markdownBlocks.length; mdIndex++) {
      const mdBlock = markdownBlocks[mdIndex];
      if (!mdBlock) continue;
      
      let bestMatch = -1;
      let bestScore = 0;

      for (let pmIndex = 0; pmIndex < proseMirrorBlocks.length; pmIndex++) {
        if (used.has(pmIndex)) continue;
        
        const pmBlock = proseMirrorBlocks[pmIndex];
        if (!pmBlock) continue;
        
        const score = this.calculateContentSimilarity(mdBlock, pmBlock);
        
        if (score > bestScore && score > 0.7) { // 相似度阈值
          bestScore = score;
          bestMatch = pmIndex;
        }
      }

      if (bestMatch !== -1) {
        const bestPmBlock = proseMirrorBlocks[bestMatch];
        if (bestPmBlock) {
          used.add(bestMatch);
          mapping.set(mdIndex, bestPmBlock);
          console.log(`相似度映射 ${mdIndex}: score=${bestScore.toFixed(2)} MD[${mdBlock.type}] → PM[${bestPmBlock.type}] path[${bestPmBlock.path.join('.')}]`);
        }
      } else {
        console.warn(`❌ 无法为 Markdown 块 ${mdIndex} 找到匹配的 ProseMirror 节点`);
      }
    }

    return mapping;
  }

  /**
   * 计算内容相似度
   */
  private static calculateContentSimilarity(
    mdBlock: MarkdownBlock, 
    pmNode: NodeInfo & { actualContent?: string }
  ): number {
    // 1. 类型匹配分数
    const typeScore = this.getTypeMatchScore(mdBlock.type, pmNode.type);
    if (typeScore === 0) return 0; // 类型不匹配直接跳过
    
    // 2. 内容相似度
    const mdContent = this.extractTextFromMarkdownBlock(mdBlock);
    const pmContent = this.extractTextFromProseMirrorNode(pmNode);
    const contentScore = this.getTextSimilarity(mdContent, pmContent);
    
    // 3. 长度相似度
    const lengthScore = this.getLengthSimilarity(mdContent.length, pmContent.length);
    
    return typeScore * 0.5 + contentScore * 0.4 + lengthScore * 0.1;
  }

  /**
   * 类型匹配分数
   */
  private static getTypeMatchScore(mdType: string, pmType: string): number {
    // 精确匹配
    if (mdType === pmType) return 1.0;
    
    // 兼容匹配
    const compatibilityMap: Record<string, string[]> = {
      'paragraph': ['paragraph'],
      'heading': ['heading'],
      'list_item': ['bullet_list', 'ordered_list'],
      'code_block': ['code_block'],
      'blockquote': ['blockquote']
    };
    
    const compatible = compatibilityMap[mdType] || [];
    return compatible.includes(pmType) ? 0.8 : 0.0;
  }

  /**
   * 从 Markdown 块提取纯文本
   */
  private static extractTextFromMarkdownBlock(block: MarkdownBlock): string {
    const content = Array.isArray(block.content) ? block.content.join(' ') : (block.content || '');
    // 移除 Markdown 语法标记
    return content
      .replace(/^#{1,6}\s+/, '') // 标题标记
      .replace(/\*\*(.*?)\*\*/g, '$1') // 粗体
      .replace(/\*(.*?)\*/g, '$1') // 斜体
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 链接
      .replace(/`(.*?)`/g, '$1') // 行内代码
      .trim()
      .toLowerCase();
  }

  /**
   * 从 ProseMirror 节点提取纯文本
   */
  private static extractTextFromProseMirrorNode(nodeInfo: NodeInfo & { actualContent?: string }): string {
    if (nodeInfo.actualContent) {
      return nodeInfo.actualContent.trim().toLowerCase();
    }
    // 回退到类型名称
    return nodeInfo.type.toLowerCase();
  }

  /**
   * 文本相似度计算
   */
  private static getTextSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1.0;
    if (text1.length === 0 && text2.length === 0) return 1.0;
    if (text1.length === 0 || text2.length === 0) return 0.0;
    
    // 包含关系
    if (text1.includes(text2) || text2.includes(text1)) return 0.8;
    
    // 编辑距离
    const distance = this.levenshteinDistance(text1, text2);
    const maxLength = Math.max(text1.length, text2.length);
    
    return 1 - (distance / maxLength);
  }

  /**
   * 长度相似度
   */
  private static getLengthSimilarity(len1: number, len2: number): number {
    if (len1 === 0 && len2 === 0) return 1.0;
    const maxLen = Math.max(len1, len2);
    const minLen = Math.min(len1, len2);
    return minLen / maxLen;
  }

  /**
   * 编辑距离计算
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) matrix[0]![i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j]![0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j]![i] = Math.min(
          matrix[j]![i - 1]! + 1,
          matrix[j - 1]![i]! + 1,
          matrix[j - 1]![i - 1]! + indicator
        );
      }
    }

    return matrix[str2.length]![str1.length]!;
  }
}
