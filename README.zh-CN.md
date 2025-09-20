# markdown-diff-prosemirror

[English](README.md) | [中文](README.zh-CN.md)

一个用于将 Markdown 差异转换为 ProseMirror 转换操作的 TypeScript 库，支持高效的文档同步和协作编辑功能。

## 功能特性

- 🔄 **转换 Markdown 差异** 为 ProseMirror 文档操作
- 📊 **分析 ProseMirror 文档** 并提供详细的节点映射
- 🧩 **解析 Markdown** 为结构化块格式
- 📝 **处理行内格式** (粗体、斜体、代码、链接)
- 🏗️ **支持块级元素** (标题、列表、代码块、引用块)
- ⚡ **高效差异计算** 支持可配置的粒度
- 🎯 **批量转换** 支持多文档处理
- 🔀 **序列化 ProseMirror** 文档回 Markdown 格式，完整保留格式
- ✔️ **验证 Markdown 语法** 确保输出质量
- ✅ **完整 TypeScript 支持** 提供全面的类型定义

## 安装

```bash
npm install markdown-diff-prosemirror
```

## 快速开始

```typescript
import MarkdownDiffProseMirrorTransformer, { 
  ProseMirrorDocument,
  proseMirrorToMarkdown 
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

// 转换文档
const result = await MarkdownDiffProseMirrorTransformer.transform(
  originalMarkdown,
  modifiedMarkdown,
  originalDoc
);

if (result.success) {
  console.log('新文档:', result.newDocument);
  console.log('应用的操作数量:', result.operations.length);
  console.log('统计信息:', result.statistics);
  
  // 将结果转换回 Markdown
  const resultMarkdown = proseMirrorToMarkdown(result.newDocument);
  console.log('结果的 Markdown 格式:', resultMarkdown);
} else {
  console.error('转换失败:', result.errors);
}
```

## 核心组件

### MarkdownDiffProseMirrorTransformer

负责协调转换过程的主要转换器类。

#### 静态方法

- `transform(originalMarkdown, modifiedMarkdown, originalDoc, options?)` - 将 Markdown 差异转换为 ProseMirror
- `transformDocument(originalMarkdown, modifiedMarkdown, originalDoc)` - 转换并直接返回新文档
- `transformWithValidation(...)` - 带输入验证的转换
- `batchTransform(transformations)` - 批量处理多个转换
- `validateProseMirrorDocument(doc)` - 验证 ProseMirror 文档结构
- `createEmptyDocument()` - 创建空的 ProseMirror 文档

### MarkdownParser

将 Markdown 文本解析为结构化块和行内元素。

```typescript
import { MarkdownParser } from 'markdown-diff-prosemirror';

// 解析为块
const blocks = MarkdownParser.parseToBlocks(markdown);

// 解析行内 Markdown
const inlineTokens = MarkdownParser.parseInlineMarkdown('这是 **粗体** 文本');
```

### ProseMirrorAnalyzer

分析 ProseMirror 文档以了解其结构。

```typescript
import { ProseMirrorAnalyzer } from 'markdown-diff-prosemirror';

const analysis = ProseMirrorAnalyzer.analyzeDocument(doc);
console.log('节点映射:', analysis.nodeMap);
console.log('文本位置:', analysis.textPositions);
console.log('块结构:', analysis.blockStructure);
```

### ProseMirrorToMarkdownSerializer

将 ProseMirror 文档转换回 Markdown 格式，完整支持格式化。

```typescript
import { 
  ProseMirrorToMarkdownSerializer, 
  proseMirrorToMarkdown,
  validateMarkdownSyntax,
  DefaultCustomConverters,
  createCustomConverter,
  mergeCustomConverters
} from 'markdown-diff-prosemirror';

// 基本使用
const serializer = new ProseMirrorToMarkdownSerializer();
const markdown = serializer.serialize(proseMirrorDoc);

// 使用便捷函数
const markdown = proseMirrorToMarkdown(proseMirrorDoc);

// 使用自定义转换器处理特殊节点类型
const customConverters = {
  'blok': (node) => `<!-- 自定义块: ${node.attrs?.id} -->`,
  'customComponent': (node) => `[${node.attrs?.component || '组件'}]`
};

const serializerWithCustom = new ProseMirrorToMarkdownSerializer(customConverters);
const customMarkdown = serializerWithCustom.serialize(proseMirrorDoc);

// 使用预定义转换器
const serializerWithDefaults = new ProseMirrorToMarkdownSerializer(DefaultCustomConverters);

// 验证 Markdown 语法
const validation = validateMarkdownSyntax(markdown);
if (validation.valid) {
  console.log('生成的 Markdown 语法正确');
} else {
  console.error('Markdown 语法错误:', validation.error);
}
```

### MarkdownToProseMirrorMapper

用于格式间转换的底层映射功能。

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

## 自定义节点转换器

该库支持自定义转换器来处理没有标准 Markdown 等价物的特殊 ProseMirror 节点类型。

### 创建自定义转换器

```typescript
import { createCustomConverter, mergeCustomConverters } from 'markdown-diff-prosemirror';

// 创建单个转换器
const blokConverter = createCustomConverter('blok', (node) => {
  const attrs = node.attrs || {};
  const id = attrs.id || 'unknown';
  const body = attrs.body || [];
  
  const content = body
    .map((item: any) => {
      if (item.description) return item.description;
      if (item.title) return item.title;
      if (item.code) return `\`\`\`\n${item.code}\n\`\`\``;
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
  
  return `<!-- Blok: ${id} -->\n${content}`;
});

// 合并多个转换器
const allConverters = mergeCustomConverters(
  DefaultCustomConverters,
  blokConverter,
  createCustomConverter('video', (node) => `[视频: ${node.attrs?.title || '无标题'}]`)
);

// 与序列化器一起使用
const serializer = new ProseMirrorToMarkdownSerializer(allConverters);
```

### 序列化选项

```typescript
interface SerializeOptions {
  customConverters?: CustomNodeConverters;  // 自定义节点转换器
  fallbackToParagraph?: boolean;            // 对未知节点回退到段落 (默认: true)
  includeUnknownNodes?: boolean;            // 将未知节点包含为注释 (默认: false)
}
```

## 转换选项

```typescript
interface TransformOptions {
  preserveFormatting?: boolean;     // 保持原始格式标记 (默认: true)
  handleStructuralChanges?: boolean; // 处理块级变更 (默认: true)
  granularity?: 'block' | 'line' | 'character'; // 差异粒度 (默认: 'block')
}
```

## 支持的 Markdown 元素

### 块级元素
- 标题 (`# ## ### #### ##### ######`)
- 段落
- 列表 (有序和无序)
- 代码块 (```lang)
- 引用块 (`>`)
- 分隔线 (`---`, `***`, `___`)

### 行内元素
- **粗体** (`**text**`)
- *斜体* (`*text*`)
- `代码` (`` `text` ``)
- [链接]() (`[text](url)`)

## API 参考

### 主要功能

#### 1. Markdown 差异转换（核心功能）

```typescript
import MarkdownDiffProseMirrorTransformer from 'markdown-diff-prosemirror';

// 将 Markdown 差异应用到 ProseMirror 文档
const result = await MarkdownDiffProseMirrorTransformer.transformDocument(
  originalMarkdown,      // 原始 Markdown
  modifiedMarkdown,      // 修改后 Markdown
  originalProseMirrorDoc // 原始 ProseMirror 文档
);
```

#### 2. ProseMirror 到 Markdown 序列化（新增功能）

```typescript
import { proseMirrorToMarkdown, ProseMirrorToMarkdownSerializer } from 'markdown-diff-prosemirror';

// 方式一：使用便捷函数
const markdown = proseMirrorToMarkdown(proseMirrorDoc);

// 方式二：使用类
const serializer = new ProseMirrorToMarkdownSerializer();
const markdown = serializer.serialize(proseMirrorDoc);
```

#### 3. Markdown 语法验证

```typescript
import { validateMarkdownSyntax } from 'markdown-diff-prosemirror';

const validation = validateMarkdownSyntax(markdownString);
if (!validation.valid) {
  console.error('Markdown 语法错误:', validation.error);
}
```

### 类型定义

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

### 支持的 Markdown 功能

序列化器支持完整的 Markdown 语法，包括：

- ✅ **列表**：`bullet_list`, `ordered_list`, `list_item`
- ✅ **标题**：`heading` (H1-H6)
- ✅ **段落**：`paragraph`
- ✅ **格式**：**粗体**、*斜体*、`代码`、[链接](url)
- ✅ **代码块**：```language
- ✅ **引用**：> blockquote
- ✅ **分割线**：---

## 开发

```bash
# 安装依赖
npm install

# 构建库
npm run build

# 运行代码检查
npm run lint

# 格式化代码
npm run format

# 运行开发模式
npm run dev
```

## 示例

查看 `/example` 目录中的完整 Next.js 演示应用程序，展示库的功能。

运行示例：

```bash
cd example
npm install
npm run dev
```

## 贡献

1. Fork 仓库
2. 创建您的功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

请确保您的代码遵循现有风格并包含适当的测试。

## 许可证

MIT © Johnny Yan

## 更新日志

### v1.0.0
- 初始版本发布
- 核心转换功能
- Markdown 解析和 ProseMirror 分析
- 全面的 TypeScript 支持
- 示例 Next.js 应用程序
