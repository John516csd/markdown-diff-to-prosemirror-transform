// Example scenarios for the markdown diff demo

export interface ExampleScenario {
  name: string;
  description: string;
  original: string;
  modified: string;
}

export const EXAMPLE_SCENARIOS: ExampleScenario[] = [
  {
    name: "Basic Text Changes",
    description: "Simple text modifications, additions, and deletions",
    original: `# Hello World

This is a simple document with **bold** text and *italics*.

## Features
- First feature
- Second feature

Here's a paragraph with some content.`,
    modified: `# Hello World

This is a simple document with **bold** text, *italics*, and ~~strikethrough~~.

## Enhanced Features
- First feature (updated)
- Second feature
- Third feature (new)

Here's a paragraph with updated content and more details.

### New Section
This is an entirely new section.`,
  },
  {
    name: "Code Block Changes",
    description: "Modifications to code blocks and syntax highlighting",
    original: `# Code Examples

Here's a JavaScript function:

\`\`\`javascript
function greet(name) {
  console.log("Hello " + name);
}
\`\`\`

And some inline code: \`let x = 5;\``,
    modified: `# Code Examples

Here's an improved JavaScript function:

\`\`\`javascript
function greet(name, greeting = "Hello") {
  console.log(\`\${greeting} \${name}!\`);
  return true;
}

// Usage example
greet("World", "Hi");
\`\`\`

And some updated inline code: \`const x = 5;\`

## TypeScript Version

\`\`\`typescript
function greet(name: string, greeting: string = "Hello"): boolean {
  console.log(\`\${greeting} \${name}!\`);
  return true;
}
\`\`\``,
  },
  {
    name: "List Structure Changes",
    description: "Complex list modifications including nesting and reordering",
    original: `# Task List

## Completed
1. Write documentation
2. Create tests
3. Fix bugs

## In Progress
- Feature A
- Feature B

## Todo
- Feature C
- Feature D`,
    modified: `# Task List

## Completed
1. Write documentation
2. Create comprehensive tests
3. Fix critical bugs
4. Code review

## In Progress
- Feature A (80% done)
  - Sub-task A1
  - Sub-task A2
- Feature B
  - Sub-task B1

## Todo
- Feature C
- Feature D (high priority)
- Feature E (new requirement)

## On Hold
- Legacy feature support`,
  },
  {
    name: "Table and Quote Changes",
    description: "Modifications to tables, blockquotes, and structured content",
    original: `# Data Overview

> Important: This data is from last quarter.

## Performance Metrics

| Metric | Q1 | Q2 |
|--------|----|----|
| Revenue | $100k | $120k |
| Users | 1000 | 1200 |

## Notes
Simple notes here.`,
    modified: `# Data Overview

> **Updated**: This data includes current quarter projections.

## Performance Metrics

| Metric | Q1 | Q2 | Q3 | Q4 (Projected) |
|--------|----|----|----| -------------- |
| Revenue | $100k | $120k | $140k | $160k |
| Users | 1000 | 1200 | 1500 | 1800 |
| Retention | 85% | 87% | 90% | 92% |

## Detailed Notes

Multiple paragraphs with detailed analysis:

1. Revenue growth is accelerating
2. User acquisition is strong
3. Retention rates are improving

> **Key Insight**: The trend is very positive for Q4.`,
  },
  {
    name: "Minimal Changes",
    description: "Very small changes to test granular diff detection",
    original: `# Project Status

Everything is working fine.

- Status: Good
- Last updated: Monday`,
    modified: `# Project Status

Everything is working perfectly.

- Status: Excellent
- Last updated: Tuesday
- Next review: Friday`,
  },
  {
    name: "Major Restructuring",
    description: "Significant document structure changes",
    original: `# Old Document

## Section 1
Content 1

## Section 2
Content 2

## Section 3
Content 3`,
    modified: `# Restructured Document

## Introduction
New opening content with context.

## Part A: Overview
### Section 1 (Updated)
Enhanced content 1 with more details.

### Section 1.1
New subsection content.

## Part B: Details
### Section 2 (Revised)
Completely rewritten content 2.

### Section 4 (New)
Entirely new section content.

## Conclusion
Final thoughts and summary.`,
  }
];

export const DEFAULT_EXAMPLE = EXAMPLE_SCENARIOS[0];
