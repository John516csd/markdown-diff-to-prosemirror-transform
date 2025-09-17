import { ProseMirrorDocument, ProseMirrorNode } from './types';
import { defaultMarkdownSerializer } from 'prosemirror-markdown';
import { Node as ProseMirrorModelNode } from 'prosemirror-model';
import { defaultMarkdownParser } from 'prosemirror-markdown';

/**
 * ProseMirror 文档到 Markdown 的序列化器
 * 支持 bullet_list、ordered_list 等完整的 Markdown 功能
 */
export class ProseMirrorToMarkdownSerializer {
  private schema = defaultMarkdownParser.schema;

  /**
   * 将 ProseMirror 文档转换为 Markdown 字符串
   */
  serialize(doc: ProseMirrorDocument): string {
    try {
      // 将自定义 ProseMirrorDocument 转换为 ProseMirror Node
      const proseMirrorNode = this.convertToProseMirrorNode(doc);
      
      // 使用官方序列化器转换为 markdown
      return defaultMarkdownSerializer.serialize(proseMirrorNode);
    } catch (error) {
      console.error('Error serializing ProseMirror document to Markdown:', error);
      throw new Error('Failed to serialize ProseMirror document to Markdown');
    }
  }

  /**
   * 将自定义 ProseMirrorDocument 转换为 ProseMirror Model Node
   */
  private convertToProseMirrorNode(doc: ProseMirrorDocument): ProseMirrorModelNode {
    if (doc.type !== 'doc' || !doc.content) {
      throw new Error('Invalid ProseMirror document: must be a doc with content');
    }

    // 递归转换所有子节点
    const content = doc.content.map(node => this.convertNodeToProseMirror(node));
    
    return this.schema.node('doc', {}, content);
  }

  /**
   * 递归转换单个节点
   */
  private convertNodeToProseMirror(node: ProseMirrorNode): ProseMirrorModelNode {
    try {
      const nodeType = this.schema.nodes[node.type];
      if (!nodeType) {
        // 如果节点类型不存在，转换为段落并发出警告
        console.warn(`Unknown node type: ${node.type}, converting to paragraph`);
        return this.schema.node('paragraph', {}, node.content ? 
          node.content.map((child: ProseMirrorNode) => this.convertNodeToProseMirror(child)) : 
          [this.schema.text(node.text || '')]
        );
      }

      // 处理文本节点
      if (node.type === 'text') {
        let textNode = this.schema.text(node.text || '');
        
        // 应用标记
        if (node.marks && node.marks.length > 0) {
          const validMarks = [];
          for (const mark of node.marks) {
            const markType = this.schema.marks[mark.type];
            if (markType) {
              // 验证并过滤属性，只保留 schema 中定义的属性
              const validAttrs: Record<string, unknown> = {};
              const markAttrs = mark.attrs || {};
              
              if (markType.spec && markType.spec.attrs) {
                for (const attrName in markType.spec.attrs) {
                  if (markAttrs[attrName] !== undefined) {
                    validAttrs[attrName] = markAttrs[attrName];
                  }
                }
              }
              
              validMarks.push(markType.create(validAttrs));
            } else {
              // 忽略未知的标记类型，如 textStyle
              console.warn(`Unknown mark type: ${mark.type}, skipping`);
            }
          }
          
          if (validMarks.length > 0) {
            textNode = textNode.mark(validMarks);
          }
        }
        
        return textNode;
      }

      // 处理其他节点类型
      // 验证并过滤属性，只保留 schema 中定义的属性
      const validAttrs: Record<string, unknown> = {};
      const nodeAttrs = node.attrs || {};
      
      if (nodeType.spec && nodeType.spec.attrs) {
        for (const attrName in nodeType.spec.attrs) {
          if (nodeAttrs[attrName] !== undefined) {
            validAttrs[attrName] = nodeAttrs[attrName];
          }
        }
      }
      
      const content = node.content ? 
        node.content.map((child: ProseMirrorNode) => this.convertNodeToProseMirror(child)) : 
        [];

      return this.schema.node(node.type, validAttrs, content);
    } catch (error) {
      console.error(`Error converting node ${node.type}:`, error);
      // 回退到段落节点，包含原始文本内容
      return this.schema.node('paragraph', {}, [this.schema.text(node.text || JSON.stringify(node))]);
    }
  }
}

/**
 * 便捷函数：将 ProseMirror 文档转换为 Markdown
 */
export function proseMirrorToMarkdown(doc: ProseMirrorDocument): string {
  const serializer = new ProseMirrorToMarkdownSerializer();
  return serializer.serialize(doc);
}

/**
 * 便捷函数：验证 Markdown 语法
 */
export function validateMarkdownSyntax(markdown: string): { valid: boolean; error?: string } {
  try {
    const parsed = defaultMarkdownParser.parse(markdown);
    return { valid: !!parsed };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    };
  }
}
