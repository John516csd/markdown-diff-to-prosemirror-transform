import type { ProseMirrorDocument, ProseMirrorNode as CustomProseMirrorNode } from 'markdown-diff-prosemirror';
import { defaultMarkdownParser, defaultMarkdownSerializer } from 'prosemirror-markdown';
import { Node as ProseMirrorNode } from 'prosemirror-model';

// 使用默认的 markdown parser 和 serializer
// 使用 markdown parser 的 schema，它包含了 bullet_list 和 list_item 节点
const markdownParser = defaultMarkdownParser;
const markdownSerializer = defaultMarkdownSerializer;
const schema = markdownParser.schema;

export class ProseMirrorToMarkdown {
  convert(doc: ProseMirrorDocument): string {
    try {
      // 将我们的自定义ProseMirrorDocument转换为ProseMirror Node
      const proseMirrorNode = this.convertToProseMirrorNode(doc);
      
      // 使用官方序列化器转换为markdown
      return markdownSerializer.serialize(proseMirrorNode);
    } catch (error) {
      console.error('Error converting ProseMirror to Markdown:', error);
      throw new Error('Failed to convert ProseMirror document to Markdown');
    }
  }

  private convertToProseMirrorNode(doc: ProseMirrorDocument): ProseMirrorNode {
    if (doc.type !== 'doc' || !doc.content) {
      throw new Error('Invalid ProseMirror document');
    }

    // 将自定义类型转换为ProseMirror Node
    const content = doc.content.map(node => this.convertNodeToProseMirror(node));
    
    return schema.node('doc', {}, content);
  }

  private convertNodeToProseMirror(node: CustomProseMirrorNode): ProseMirrorNode {
    try {
      const nodeType = schema.nodes[node.type];
      if (!nodeType) {
        // 如果节点类型不存在，转换为段落
        console.warn(`Unknown node type: ${node.type}, converting to paragraph`);
        return schema.node('paragraph', {}, node.content ? 
          node.content.map((child: CustomProseMirrorNode) => this.convertNodeToProseMirror(child)) : 
          [schema.text(node.text || '')]
        );
      }

      // 处理文本节点
      if (node.type === 'text') {
        let textNode = schema.text(node.text || '');
        
        // 应用标记
        if (node.marks && node.marks.length > 0) {
          const validMarks = [];
          for (const mark of node.marks) {
            const markType = schema.marks[mark.type];
            if (markType) {
              // 验证并过滤属性，只保留schema中定义的属性
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
      // 验证并过滤属性，只保留schema中定义的属性
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
        node.content.map((child: CustomProseMirrorNode) => this.convertNodeToProseMirror(child)) : 
        [];

      return schema.node(node.type, validAttrs, content);
    } catch (error) {
      console.error(`Error converting node ${node.type}:`, error);
      // fallback to paragraph with text content
      return schema.node('paragraph', {}, [schema.text(node.text || JSON.stringify(node))]);
    }
  }
}

export class MarkdownToProseMirror {
  convert(markdown: string): ProseMirrorDocument {
    try {
      // 使用官方解析器解析markdown
      const proseMirrorNode = markdownParser.parse(markdown);
      
      if (!proseMirrorNode) {
        throw new Error('Failed to parse markdown');
      }

      // 转换为我们的自定义格式
      return this.convertFromProseMirrorNode(proseMirrorNode);
    } catch (error) {
      console.error('Error converting Markdown to ProseMirror:', error);
      throw new Error('Failed to convert Markdown to ProseMirror document');
    }
  }

  private convertFromProseMirrorNode(node: ProseMirrorNode): ProseMirrorDocument {
    return {
      type: 'doc',
      content: node.content ? this.convertNodeContent(node.content) : []
    };
  }

  private convertNodeContent(content: ProseMirrorNode['content']): CustomProseMirrorNode[] {
    const result: CustomProseMirrorNode[] = [];
    
    if (content) {
      for (let i = 0; i < content.childCount; i++) {
        const child = content.child(i);
        result.push(this.convertSingleNode(child));
      }
    }
    
    return result;
  }

  private convertSingleNode(node: ProseMirrorNode): CustomProseMirrorNode {
    const result: CustomProseMirrorNode = {
      type: node.type.name
    };

    // 添加属性
    if (node.attrs && Object.keys(node.attrs).length > 0) {
      result.attrs = { ...node.attrs };
    }

    // 处理文本节点
    if (node.isText) {
      result.text = node.text;
      
      // 处理标记
      if (node.marks && node.marks.length > 0) {
        result.marks = node.marks.map(mark => ({
          type: mark.type.name,
          attrs: mark.attrs && Object.keys(mark.attrs).length > 0 ? { ...mark.attrs } : undefined
        }));
      }
    }

    // 处理内容
    if (node.content && node.content.childCount > 0) {
      result.content = this.convertNodeContent(node.content);
    }

    return result;
  }
}

// 导出一些有用的工具函数
export function createEmptyProseMirrorDocument(): ProseMirrorDocument {
  return {
    type: 'doc',
    content: []
  };
}

export function validateMarkdown(markdown: string): { valid: boolean; error?: string } {
  try {
    const parser = new MarkdownToProseMirror();
    parser.convert(markdown);
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
