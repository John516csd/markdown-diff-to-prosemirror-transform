import {
  ProseMirrorDocument,
  ProseMirrorNode,
  CustomNodeConverters,
  SerializeOptions,
} from './types';
import { defaultMarkdownSerializer } from 'prosemirror-markdown';
import { Node as ProseMirrorModelNode } from 'prosemirror-model';
import { defaultMarkdownParser } from 'prosemirror-markdown';

/**
 * ProseMirror 文档到 Markdown 的序列化器
 * 支持 bullet_list、ordered_list 等完整的 Markdown 功能
 */
export class ProseMirrorToMarkdownSerializer {
  private schema = defaultMarkdownParser.schema;
  private customConverters: CustomNodeConverters = {};
  private options: SerializeOptions = {
    fallbackToParagraph: true,
    includeUnknownNodes: false,
  };

  constructor(
    customConverters?: CustomNodeConverters,
    options?: SerializeOptions
  ) {
    if (customConverters) {
      this.customConverters = customConverters;
    }
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }

  /**
   * 将 ProseMirror 文档转换为 Markdown 字符串
   */
  serialize(doc: ProseMirrorDocument): string {
    try {
      // 首先尝试使用自定义转换器进行直接转换
      const customResult = this.tryCustomSerialization(doc);
      if (customResult !== null) {
        return customResult;
      }

      // 将自定义 ProseMirrorDocument 转换为 ProseMirror Node
      const proseMirrorNode = this.convertToProseMirrorNode(doc);

      // 使用官方序列化器转换为 markdown
      return defaultMarkdownSerializer.serialize(proseMirrorNode);
    } catch (error) {
      console.error(
        'Error serializing ProseMirror document to Markdown:',
        error
      );
      throw new Error('Failed to serialize ProseMirror document to Markdown');
    }
  }

  /**
   * 尝试使用自定义转换器进行序列化
   */
  private tryCustomSerialization(doc: ProseMirrorDocument): string | null {
    if (Object.keys(this.customConverters).length === 0) {
      return null;
    }

    const result: string[] = [];

    for (const node of doc.content) {
      const converted = this.convertNodeWithCustomConverters(node);
      if (converted) {
        result.push(converted);
      }
    }

    return result.join('\n\n');
  }

  /**
   * 使用自定义转换器转换单个节点
   */
  private convertNodeWithCustomConverters(
    node: ProseMirrorNode
  ): string | null {
    // 检查是否有自定义转换器
    const converter = this.customConverters[node.type];
    if (converter) {
      try {
        return converter(node);
      } catch (error) {
        console.warn(
          `Error in custom converter for node type ${node.type}:`,
          error
        );
        return this.fallbackConversion(node);
      }
    }

    // 如果没有自定义转换器，递归处理子节点
    if (node.content && node.content.length > 0) {
      const childResults: string[] = [];
      for (const child of node.content) {
        const childResult = this.convertNodeWithCustomConverters(child);
        if (childResult) {
          childResults.push(childResult);
        }
      }
      return childResults.length > 0 ? childResults.join('') : null;
    }

    return this.fallbackConversion(node);
  }

  /**
   * 回退转换方法
   */
  private fallbackConversion(node: ProseMirrorNode): string | null {
    if (this.options.fallbackToParagraph) {
      if (node.text) {
        return node.text;
      }
      if (node.content && node.content.length > 0) {
        const childTexts = node.content
          .map((child) => this.convertNodeWithCustomConverters(child))
          .filter(Boolean);
        return childTexts.join('');
      }
      // 对于没有文本内容的节点，返回空字符串而不是null
      return '';
    }

    if (this.options.includeUnknownNodes) {
      return `<!-- Unknown node: ${node.type} -->`;
    }

    return null;
  }

  /**
   * 将自定义 ProseMirrorDocument 转换为 ProseMirror Model Node
   */
  private convertToProseMirrorNode(
    doc: ProseMirrorDocument
  ): ProseMirrorModelNode {
    if (doc.type !== 'doc' || !doc.content) {
      throw new Error(
        'Invalid ProseMirror document: must be a doc with content'
      );
    }

    // 递归转换所有子节点
    const content = doc.content.map((node) =>
      this.convertNodeToProseMirror(node)
    );

    return this.schema.node('doc', {}, content);
  }

  /**
   * 递归转换单个节点
   */
  private convertNodeToProseMirror(
    node: ProseMirrorNode
  ): ProseMirrorModelNode {
    try {
      const nodeType = this.schema.nodes[node.type];
      if (!nodeType) {
        // 如果节点类型不存在，转换为段落并发出警告
        console.warn(
          `Unknown node type: ${node.type}, converting to paragraph`
        );
        return this.schema.node(
          'paragraph',
          {},
          node.content
            ? node.content.map((child: ProseMirrorNode) =>
                this.convertNodeToProseMirror(child)
              )
            : [this.schema.text(node.text || '')]
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

      const content = node.content
        ? node.content.map((child: ProseMirrorNode) =>
            this.convertNodeToProseMirror(child)
          )
        : [];

      return this.schema.node(node.type, validAttrs, content);
    } catch (error) {
      console.error(`Error converting node ${node.type}:`, error);
      // 回退到段落节点，包含原始文本内容
      const textContent = node.text || JSON.stringify(node);
      return this.schema.node(
        'paragraph',
        {},
        textContent ? [this.schema.text(textContent)] : []
      );
    }
  }
}

/**
 * 便捷函数：将 ProseMirror 文档转换为 Markdown
 */
export function proseMirrorToMarkdown(
  doc: ProseMirrorDocument,
  customConverters?: CustomNodeConverters,
  options?: SerializeOptions
): string {
  const serializer = new ProseMirrorToMarkdownSerializer(
    customConverters,
    options
  );
  return serializer.serialize(doc);
}

/**
 * 便捷函数：验证 Markdown 语法
 */
export function validateMarkdownSyntax(markdown: string): {
  valid: boolean;
  error?: string;
} {
  try {
    const parsed = defaultMarkdownParser.parse(markdown);
    return { valid: !!parsed };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}

/**
 * 预定义的自定义转换器
 * 提供一些常用的自定义节点转换示例
 */
export const DefaultCustomConverters: CustomNodeConverters = {
  // 处理 blok 节点
  blok: (node: ProseMirrorNode) => {
    const attrs = node.attrs || {};
    const id = attrs.id || 'unknown';
    const body = attrs.body || [];

    // 提取 body 中的文本内容
    const textContent = body
      .map((item: any) => {
        if (item.description) return item.description;
        if (item.title) return item.title;
        if (item.code) return `\`\`\`\n${item.code}\n\`\`\``;
        return '';
      })
      .filter(Boolean)
      .join('\n\n');

    return `<!-- Blok: ${id} -->\n`;
  },

  // 处理自定义组件节点
  customComponent: (node: ProseMirrorNode) => {
    const attrs = node.attrs || {};
    const componentType = attrs.component || 'unknown';
    const content = attrs.description || attrs.title || attrs.text || '';

    return `<!-- ${componentType} -->\n${content}`;
  },
};

/**
 * 创建自定义转换器的辅助函数
 */
export function createCustomConverter(
  nodeType: string,
  converter: (node: ProseMirrorNode) => string
): CustomNodeConverters {
  return { [nodeType]: converter };
}

/**
 * 合并多个自定义转换器
 */
export function mergeCustomConverters(
  ...converters: CustomNodeConverters[]
): CustomNodeConverters {
  return converters.reduce(
    (merged, converter) => ({ ...merged, ...converter }),
    {}
  );
}
