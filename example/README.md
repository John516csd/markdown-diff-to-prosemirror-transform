# Markdown Diff ProseMirror Demo

This is a comprehensive demo application showcasing the capabilities of the `markdown-diff-prosemirror` library. The demo provides an interactive interface to explore how markdown differences are converted to ProseMirror transforms.

## Features

🎯 **Interactive Demo Interface**
- Real-time markdown diff processing
- Multiple predefined example scenarios
- Live editing of markdown content
- Detailed transformation results

📊 **Comprehensive Analysis**
- Operation breakdown and statistics
- Document structure visualization
- Error handling and validation
- Performance metrics

🎨 **Modern UI/UX**
- Built with Next.js 15 and React 19
- Shadcn/ui components for consistent design
- Responsive layout for all devices
- Dark/light mode support

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the example directory:
   ```bash
   cd example
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### Example Scenarios

The demo includes several pre-built example scenarios to demonstrate different types of markdown transformations:

1. **Basic Text Changes** - Simple text modifications, additions, and deletions
2. **Code Block Changes** - Modifications to code blocks and syntax highlighting  
3. **List Structure Changes** - Complex list modifications including nesting and reordering
4. **Table and Quote Changes** - Modifications to tables, blockquotes, and structured content
5. **Minimal Changes** - Very small changes to test granular diff detection
6. **Major Restructuring** - Significant document structure changes

### Interface Overview

#### Input Texts Section
- **Original Markdown**: The source markdown content
- **Modified Markdown**: The target markdown content after changes
- **Process Diff Button**: Triggers the transformation analysis
- **Reset Button**: Loads the default example

#### Results Tabs

1. **Transform Result**
   - Success/failure status
   - Error messages (if any)
   - Key metrics overview

2. **Operations**
   - Detailed list of all diff operations
   - Operation types, positions, and content
   - Searchable and filterable list

3. **Statistics** 
   - Processing metrics and change counts
   - Document analysis data
   - Performance information

4. **Documents**
   - Original ProseMirror document structure
   - Transformed ProseMirror document structure
   - JSON visualization of document trees

### Custom Examples

You can create your own examples by:

1. Editing the text areas directly
2. Clicking "Process Diff" to see results
3. Observing the generated operations and statistics

## Library Integration

This demo uses the `markdown-diff-prosemirror` library as follows:

```typescript
import { MarkdownDiffProseMirrorTransformer } from 'markdown-diff-prosemirror';

// Transform markdown diff to ProseMirror operations
const result = await MarkdownDiffProseMirrorTransformer.transform(
  originalMarkdown,
  modifiedMarkdown, 
  originalProseMirrorDoc,
  {
    preserveFormatting: true,
    handleStructuralChanges: true,
    granularity: 'block'
  }
);
```

## Key Components

### MarkdownDiffDemo
The main demo component that orchestrates the transformation process and displays results.

### ExampleSelector  
Provides quick access to predefined example scenarios with descriptions and metrics.

### UI Components
Built using Shadcn/ui components:
- `Card`, `Tabs`, `Button`, `Textarea`, `Badge`
- Consistent styling and accessibility features

## Development

### Project Structure

```
example/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main page
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Global styles
│   ├── components/
│   │   ├── ui/               # Shadcn/ui components
│   │   ├── markdown-diff-demo.tsx    # Main demo component
│   │   └── example-selector.tsx      # Example selector
│   └── lib/
│       ├── examples.ts       # Predefined examples
│       └── utils.ts         # Utility functions
├── package.json
└── README.md
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Customization

To add new example scenarios:

1. Edit `src/lib/examples.ts`
2. Add new `ExampleScenario` objects to the `EXAMPLE_SCENARIOS` array
3. Include name, description, original, and modified markdown content

## Technical Details

### Dependencies

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Shadcn/ui** - Component library
- **ProseMirror** - Rich text editing framework
- **markdown-diff-prosemirror** - The library being demonstrated

### Performance Considerations

- Transforms are processed asynchronously to avoid blocking the UI
- Large documents are handled efficiently
- Error boundaries prevent crashes from malformed input
- Lazy loading for optimal bundle size

## Troubleshooting

### Common Issues

1. **Transform Fails**
   - Check that both original and modified text are provided
   - Ensure markdown syntax is valid
   - Review error messages in the results

2. **Slow Processing**
   - Large documents may take time to process
   - Consider breaking large documents into smaller chunks
   - Check browser developer tools for performance insights

3. **Display Issues**
   - Ensure all dependencies are installed
   - Check browser console for JavaScript errors
   - Verify Node.js version compatibility

## Contributing

To contribute improvements to this demo:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This demo is part of the markdown-diff-prosemirror project and follows the same MIT license.