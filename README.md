# markdown-diff-prosemirror

A TypeScript library for converting Markdown diffs to ProseMirror transforms, enabling efficient document synchronization and collaborative editing features.

## Features

- 🔄 **Transform Markdown diffs** to ProseMirror document operations
- 📊 **Analyze ProseMirror documents** with detailed node mapping
- 🧩 **Parse Markdown** into structured block format
- 📝 **Handle inline formatting** (bold, italic, code, links)
- 🏗️ **Support block elements** (headings, lists, code blocks, blockquotes)
- ⚡ **Efficient diff computation** with configurable granularity
- 🎯 **Batch transformations** for processing multiple documents
- ✅ **Full TypeScript support** with comprehensive type definitions

## Installation

```bash
npm install markdown-diff-prosemirror
```

## Quick Start

```typescript
import MarkdownDiffProseMirrorTransformer, { 
  ProseMirrorDocument 
} from 'markdown-diff-prosemirror';

const originalMarkdown = `
# Hello World
This is a **sample** document.
`;

const modifiedMarkdown = `
# Hello World
This is a **modified sample** document with more content.

## New Section
Added a new section here.
`;

const originalDoc: ProseMirrorDocument = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Hello World' }]
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'This is a ' },
        { type: 'text', text: 'sample', marks: [{ type: 'strong' }] },
        { type: 'text', text: ' document.' }
      ]
    }
  ]
};

// Transform the document
const result = await MarkdownDiffProseMirrorTransformer.transform(
  originalMarkdown,
  modifiedMarkdown,
  originalDoc
);

if (result.success) {
  console.log('New document:', result.newDocument);
  console.log('Operations applied:', result.operations.length);
  console.log('Statistics:', result.statistics);
} else {
  console.error('Transform failed:', result.errors);
}
```

## Core Components

### MarkdownDiffProseMirrorTransformer

The main transformer class that orchestrates the conversion process.

#### Static Methods

- `transform(originalMarkdown, modifiedMarkdown, originalDoc, options?)` - Transform markdown diffs to ProseMirror
- `transformDocument(originalMarkdown, modifiedMarkdown, originalDoc)` - Transform and return the new document directly
- `transformWithValidation(...)` - Transform with input validation
- `batchTransform(transformations)` - Process multiple transformations in batch
- `validateProseMirrorDocument(doc)` - Validate a ProseMirror document structure
- `createEmptyDocument()` - Create an empty ProseMirror document

### MarkdownParser

Parse Markdown text into structured blocks and inline elements.

```typescript
import { MarkdownParser } from 'markdown-diff-prosemirror';

// Parse to blocks
const blocks = MarkdownParser.parseToBlocks(markdown);

// Parse inline markdown
const inlineTokens = MarkdownParser.parseInlineMarkdown('This is **bold** text');
```

### ProseMirrorAnalyzer

Analyze ProseMirror documents to understand their structure.

```typescript
import { ProseMirrorAnalyzer } from 'markdown-diff-prosemirror';

const analysis = ProseMirrorAnalyzer.analyzeDocument(doc);
console.log('Node map:', analysis.nodeMap);
console.log('Text positions:', analysis.textPositions);
console.log('Block structure:', analysis.blockStructure);
```

### MarkdownToProseMirrorMapper

Low-level mapping functionality for converting between formats.

```typescript
import { MarkdownToProseMirrorMapper } from 'markdown-diff-prosemirror';

const result = await MarkdownToProseMirrorMapper.transform(
  originalMarkdown,
  modifiedMarkdown,
  originalDoc,
  { 
    preserveFormatting: true,
    handleStructuralChanges: true,
    granularity: 'block'  // 'block' | 'line' | 'character'
  }
);
```

## Transform Options

```typescript
interface TransformOptions {
  preserveFormatting?: boolean;     // Keep original formatting marks (default: true)
  handleStructuralChanges?: boolean; // Process block-level changes (default: true)
  granularity?: 'block' | 'line' | 'character'; // Diff granularity (default: 'block')
}
```

## Supported Markdown Elements

### Block Elements
- Headings (`# ## ### #### ##### ######`)
- Paragraphs
- Lists (ordered and unordered)
- Code blocks (```lang)
- Blockquotes (`>`)
- Horizontal rules (`---`, `***`, `___`)

### Inline Elements
- **Bold** (`**text**`)
- *Italic* (`*text*`)
- `Code` (`` `text` ``)
- [Links]() (`[text](url)`)

## API Reference

### Types

```typescript
interface ProseMirrorDocument {
  type: 'doc';
  content: ProseMirrorNode[];
}

interface TransformResult {
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
```

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run linting
npm run lint

# Format code
npm run format

# Run development mode
npm run dev
```

## Examples

Check out the `/example` directory for a complete Next.js demo application showcasing the library's capabilities.

To run the example:

```bash
cd example
npm install
npm run dev
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the existing style and includes appropriate tests.

## License

MIT © [Your Name]

## Changelog

### v1.0.0
- Initial release
- Core transformation functionality
- Markdown parsing and ProseMirror analysis
- Comprehensive TypeScript support
- Example Next.js application