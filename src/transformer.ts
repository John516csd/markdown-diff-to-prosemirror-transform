import { ProseMirrorDocument, TransformResult, TransformOptions } from './types';
import { MarkdownToProseMirrorMapper } from './mapper';

export default class MarkdownDiffProseMirrorTransformer {
  static async transform(
    originalMarkdown: string,
    modifiedMarkdown: string,
    originalProseMirrorDoc: ProseMirrorDocument,
    options?: TransformOptions
  ): Promise<TransformResult> {
    return MarkdownToProseMirrorMapper.transform(
      originalMarkdown,
      modifiedMarkdown,
      originalProseMirrorDoc,
      options
    );
  }

  static async transformDocument(
    originalMarkdown: string,
    modifiedMarkdown: string,
    originalProseMirrorDoc: ProseMirrorDocument
  ): Promise<ProseMirrorDocument> {
    const result = await this.transform(
      originalMarkdown,
      modifiedMarkdown,
      originalProseMirrorDoc
    );
    
    if (!result.success) {
      throw new Error(`Transform failed: ${result.errors.join(', ')}`);
    }
    
    return result.newDocument;
  }

  static async transformWithValidation(
    originalMarkdown: string,
    modifiedMarkdown: string,
    originalProseMirrorDoc: ProseMirrorDocument,
    options?: TransformOptions
  ): Promise<TransformResult> {
    if (!originalMarkdown || typeof originalMarkdown !== 'string') {
      throw new Error('Original markdown must be a non-empty string');
    }

    if (!modifiedMarkdown || typeof modifiedMarkdown !== 'string') {
      throw new Error('Modified markdown must be a non-empty string');
    }

    if (!originalProseMirrorDoc || originalProseMirrorDoc.type !== 'doc') {
      throw new Error('Original ProseMirror document must be a valid document node');
    }

    if (!Array.isArray(originalProseMirrorDoc.content)) {
      throw new Error('ProseMirror document must have a content array');
    }

    return this.transform(originalMarkdown, modifiedMarkdown, originalProseMirrorDoc, options);
  }

  static validateProseMirrorDocument(doc: any): doc is ProseMirrorDocument {
    return (
      doc &&
      typeof doc === 'object' &&
      doc.type === 'doc' &&
      Array.isArray(doc.content)
    );
  }

  static createEmptyDocument(): ProseMirrorDocument {
    return {
      type: 'doc',
      content: []
    };
  }

  static async batchTransform(
    transformations: Array<{
      originalMarkdown: string;
      modifiedMarkdown: string;
      originalProseMirrorDoc: ProseMirrorDocument;
      options?: TransformOptions;
    }>
  ): Promise<TransformResult[]> {
    const results = await Promise.allSettled(
      transformations.map(({ originalMarkdown, modifiedMarkdown, originalProseMirrorDoc, options }) =>
        this.transform(originalMarkdown, modifiedMarkdown, originalProseMirrorDoc, options)
      )
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const transformation = transformations[index];
        return {
          success: false,
          newDocument: transformation?.originalProseMirrorDoc || this.createEmptyDocument(),
          operations: [],
          errors: [result.reason?.message || 'Unknown error'],
          statistics: { nodesModified: 0, textChanges: 0, structuralChanges: 0 }
        };
      }
    });
  }

  static getVersion(): string {
    return '1.0.0';
  }

  static getSupportedNodeTypes(): string[] {
    return [
      'paragraph',
      'heading',
      'list_item',
      'code_block',
      'blockquote',
      'horizontal_rule',
      'text'
    ];
  }

  static getSupportedMarkTypes(): string[] {
    return [
      'strong',
      'em',
      'code',
      'link'
    ];
  }
}