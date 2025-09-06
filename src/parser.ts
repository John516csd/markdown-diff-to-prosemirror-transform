import { MarkdownBlock } from './types';

export class MarkdownParser {
  static parseToBlocks(markdown: string): MarkdownBlock[] {
    const lines = markdown.split('\n');
    const blocks: MarkdownBlock[] = [];
    let currentBlock: MarkdownBlock | null = null;
    let lineIndex = 0;

    for (const line of lines) {
      const blockInfo = this.identifyBlock(line, lineIndex);
      
      if (!currentBlock || blockInfo.type !== currentBlock.type || blockInfo.startNew) {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          type: blockInfo.type,
          content: [line],
          startLine: lineIndex,
          endLine: lineIndex,
          ...(blockInfo.level !== undefined && { level: blockInfo.level }),
          ...(blockInfo.attrs && { attrs: blockInfo.attrs })
        };
      } else if (currentBlock) {
        currentBlock.content.push(line);
        currentBlock.endLine = lineIndex;
      }
      
      lineIndex++;
    }
    
    if (currentBlock) {
      blocks.push(currentBlock);
    }
    
    return blocks;
  }

  private static identifyBlock(line: string, _lineIndex: number): {
    type: string;
    level?: number;
    attrs?: Record<string, any>;
    startNew: boolean;
  } {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch && headingMatch[1]) {
      const level = headingMatch[1].length;
      return {
        type: 'heading',
        level,
        attrs: { level },
        startNew: true
      };
    }

    const unorderedListMatch = line.match(/^\s*[-*+]\s+/);
    if (unorderedListMatch) {
      return {
        type: 'list_item',
        attrs: { listType: 'bullet' },
        startNew: false
      };
    }

    const orderedListMatch = line.match(/^\s*(\d+)\.\s+/);
    if (orderedListMatch && orderedListMatch[1]) {
      return {
        type: 'list_item',
        attrs: { listType: 'ordered', order: parseInt(orderedListMatch[1]) },
        startNew: false
      };
    }

    if (line.startsWith('```')) {
      const langMatch = line.match(/^```(\w+)?/);
      return {
        type: 'code_block',
        attrs: langMatch && langMatch[1] ? { language: langMatch[1] } : {},
        startNew: true
      };
    }

    if (line.startsWith('>')) {
      return {
        type: 'blockquote',
        startNew: false
      };
    }

    if (line.trim() === '') {
      return {
        type: 'empty',
        startNew: true
      };
    }

    const hrMatch = line.match(/^[-*_]{3,}$/);
    if (hrMatch) {
      return {
        type: 'horizontal_rule',
        startNew: true
      };
    }

    return {
      type: 'paragraph',
      startNew: false
    };
  }

  static parseInlineMarkdown(text: string): {
    type: string;
    text?: string;
    marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  }[] {
    const tokens: Array<{
      type: string;
      text?: string;
      marks?: Array<{ type: string; attrs?: Record<string, any> }>;
    }> = [];

    let pos = 0;
    const length = text.length;

    while (pos < length) {
      const strongMatch = text.slice(pos).match(/^\*\*(.*?)\*\*/);
      if (strongMatch && strongMatch[1] !== undefined) {
        tokens.push({
          type: 'text',
          text: strongMatch[1],
          marks: [{ type: 'strong' }]
        });
        pos += strongMatch[0].length;
        continue;
      }

      const emMatch = text.slice(pos).match(/^\*(.*?)\*/);
      if (emMatch && emMatch[1] !== undefined) {
        tokens.push({
          type: 'text',
          text: emMatch[1],
          marks: [{ type: 'em' }]
        });
        pos += emMatch[0].length;
        continue;
      }

      const codeMatch = text.slice(pos).match(/^`([^`]+)`/);
      if (codeMatch && codeMatch[1] !== undefined) {
        tokens.push({
          type: 'text',
          text: codeMatch[1],
          marks: [{ type: 'code' }]
        });
        pos += codeMatch[0].length;
        continue;
      }

      const linkMatch = text.slice(pos).match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch && linkMatch[1] !== undefined) {
        tokens.push({
          type: 'text',
          text: linkMatch[1],
          marks: [{ type: 'link', attrs: { href: linkMatch[2] || '' } }]
        });
        pos += linkMatch[0].length;
        continue;
      }

      const char = text[pos];
      if (char !== undefined) {
        tokens.push({
          type: 'text',
          text: char
        });
      }
      pos++;
    }

    return this.mergeConsecutiveTextTokens(tokens);
  }

  private static mergeConsecutiveTextTokens(
    tokens: Array<{
      type: string;
      text?: string;
      marks?: Array<{ type: string; attrs?: Record<string, any> }>;
    }>
  ): Array<{
    type: string;
    text?: string;
    marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  }> {
    const merged: Array<{
      type: string;
      text?: string;
      marks?: Array<{ type: string; attrs?: Record<string, any> }>;
    }> = [];

    for (const token of tokens) {
      const last = merged[merged.length - 1];
      
      if (
        last &&
        last.type === 'text' &&
        token.type === 'text' &&
        this.marksEqual(last.marks, token.marks)
      ) {
        last.text = (last.text || '') + (token.text || '');
      } else {
        merged.push(token);
      }
    }

    return merged;
  }

  private static marksEqual(
    marks1?: Array<{ type: string; attrs?: Record<string, any> }>,
    marks2?: Array<{ type: string; attrs?: Record<string, any> }>
  ): boolean {
    if (!marks1 && !marks2) return true;
    if (!marks1 || !marks2) return false;
    if (marks1.length !== marks2.length) return false;

    return marks1.every((mark1, index) => {
      const mark2 = marks2[index];
      if (!mark2) return false;
      return (
        mark1.type === mark2.type &&
        JSON.stringify(mark1.attrs) === JSON.stringify(mark2.attrs)
      );
    });
  }
}