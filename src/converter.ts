// Core converter implementation

import { Transform } from 'prosemirror-transform';
import { Schema } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { MarkdownDiff, ConversionOptions, MarkdownDiffConverter } from './types';

export class DefaultMarkdownDiffConverter implements MarkdownDiffConverter {
  private schema: Schema;

  constructor(schema: Schema = basicSchema) {
    this.schema = schema;
  }

  convert(diff: MarkdownDiff, options?: ConversionOptions): Transform {
    const { preserveWhitespace = false, ignoreCase = false } = options || {};
    
    // Create a new transform
    const emptyDoc = this.schema.node('doc', null, []);
    const tr = new Transform(emptyDoc);

    try {
      // Process additions
      for (const addition of diff.additions) {
        this.processAddition(tr, addition, { preserveWhitespace, ignoreCase });
      }

      // Process deletions
      for (const deletion of diff.deletions) {
        this.processDeletion(tr, deletion, { preserveWhitespace, ignoreCase });
      }

      // Process modifications
      for (const modification of diff.modifications) {
        this.processModification(tr, modification, { preserveWhitespace, ignoreCase });
      }

      return tr;
    } catch (error) {
      console.warn('Error in diff conversion:', error);
      return tr; // Return the transform as-is, even if incomplete
    }
  }

  private processAddition(
    tr: Transform, 
    addition: string, 
    options: { preserveWhitespace: boolean; ignoreCase: boolean }
  ): void {
    // Create a text node from the addition
    const textNode = this.schema.text(addition);
    const currentDoc = tr.doc;
    
    // Insert at the end of the document
    tr.insert(currentDoc.content.size, textNode);
  }

  private processDeletion(
    tr: Transform, 
    deletion: string, 
    options: { preserveWhitespace: boolean; ignoreCase: boolean }
  ): void {
    // For deletions, we would need the original position information
    // This is a simplified implementation that marks deletions conceptually
    console.log('Processing deletion:', deletion);
  }

  private processModification(
    tr: Transform,
    modification: { oldContent: string; newContent: string; position: number },
    options: { preserveWhitespace: boolean; ignoreCase: boolean }
  ): void {
    const { oldContent, newContent, position } = modification;
    const currentDoc = tr.doc;

    try {
      // Replace content at the specified position
      if (position >= 0 && position < currentDoc.content.size) {
        const newText = this.schema.text(newContent);
        const from = position;
        const to = Math.min(position + oldContent.length, currentDoc.content.size);
        
        tr.replaceWith(from, to, newText);
      }
    } catch (error) {
      console.warn('Error processing modification:', error);
    }
  }
}

export function createConverter(schema?: Schema): MarkdownDiffConverter {
  return new DefaultMarkdownDiffConverter(schema);
}