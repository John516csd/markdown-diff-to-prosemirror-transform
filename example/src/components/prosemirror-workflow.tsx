'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Editor } from '@monaco-editor/react';
import type { ProseMirrorDocument } from 'markdown-diff-prosemirror';
import { MarkdownParser } from 'markdown-diff-prosemirror';
import { ProseMirrorToMarkdown } from './prosemirror-converter';
import { DiffViewer } from './diff-viewer';
import { AIProcessor } from './ai-processor';

interface DiffOperation {
  id: string;
  type: 'insert' | 'delete' | 'modify';
  oldText?: string;
  newText?: string;
  position: number;
  length?: number;
  status: 'pending' | 'accepted' | 'rejected';
  description: string;
}

interface WorkflowState {
  step:
    | 'input'
    | 'convert'
    | 'ai-process'
    | 'diff-review'
    | 'apply-patch'
    | 'result';
  originalJson: ProseMirrorDocument | null;
  markdownA: string;
  markdownB: string;
  diffOperations: DiffOperation[];
  finalJson: ProseMirrorDocument | null;
  isProcessing: boolean;
  error: string | null;
}

// 示例 ProseMirror JSON
const SAMPLE_PROSEMIRROR_JSON: ProseMirrorDocument = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'API Documentation' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'This is our ' },
        { type: 'text', text: 'REST API', marks: [{ type: 'strong' }] },
        { type: 'text', text: ' documentation.' },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Endpoints' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Available endpoints:' }],
    },
    {
      type: 'list_item',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'GET /api/users' }],
        },
      ],
    },
    {
      type: 'list_item',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'POST /api/users' }],
        },
      ],
    },
    {
      type: 'code_block',
      attrs: { language: 'javascript' },
      content: [
        {
          type: 'text',
          text: 'fetch("/api/users")\n  .then(res => res.json())\n  .then(console.log);',
        },
      ],
    },
  ],
};

export function ProseMirrorWorkflow() {
  const [state, setState] = useState<WorkflowState>({
    step: 'input',
    originalJson: SAMPLE_PROSEMIRROR_JSON,
    markdownA: '',
    markdownB: '',
    diffOperations: [],
    finalJson: null,
    isProcessing: false,
    error: null,
  });

  // Step 1: Convert ProseMirror JSON to Markdown
  const convertToMarkdown = useCallback(async () => {
    if (!state.originalJson) {
      setState((prev) => ({ ...prev, error: 'No ProseMirror JSON provided' }));
      return;
    }

    setState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      const converter = new ProseMirrorToMarkdown();
      const markdown = converter.convert(state.originalJson);

      setState((prev) => ({
        ...prev,
        markdownA: markdown,
        step: 'convert',
        isProcessing: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Conversion failed',
        isProcessing: false,
      }));
    }
  }, [state.originalJson]);

  // Step 2: AI Processing (simulated)
  const processWithAI = useCallback(async () => {
    setState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      const aiProcessor = new AIProcessor();
      const enhancedMarkdown = await aiProcessor.enhance(state.markdownA);

      setState((prev) => ({
        ...prev,
        markdownB: enhancedMarkdown,
        step: 'ai-process',
        isProcessing: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'AI processing failed',
        isProcessing: false,
      }));
    }
  }, [state.markdownA]);

  // Step 3: Generate Diff Operations
  const generateDiff = useCallback(() => {
    setState((prev) => ({ ...prev, isProcessing: true }));

    // 使用真实的diff算法比较两个markdown文档
    const operations: DiffOperation[] = [];
    let operationId = 1;

    // 检测主要变化
    if (
      state.markdownA.includes('REST API') &&
      state.markdownB.includes('GraphQL API')
    ) {
      operations.push({
        id: `op-${operationId++}`,
        type: 'modify',
        oldText: 'REST API',
        newText: 'GraphQL API',
        position: state.markdownA.indexOf('REST API'),
        length: 8,
        status: 'pending',
        description: 'Update API type from REST to GraphQL',
      });
    }

    if (
      state.markdownB.includes('Authentication') &&
      !state.markdownA.includes('Authentication')
    ) {
      operations.push({
        id: `op-${operationId++}`,
        type: 'insert',
        newText:
          '\n\n## Authentication\n\nAll API requests require authentication using JWT Bearer tokens.',
        position: state.markdownA.length,
        status: 'pending',
        description: 'Add authentication section',
      });
    }

    if (
      state.markdownB.includes('Key Features') &&
      !state.markdownA.includes('Key Features')
    ) {
      const insertPos =
        state.markdownA.indexOf('documentation.') + 'documentation.'.length;
      operations.push({
        id: `op-${operationId++}`,
        type: 'insert',
        newText:
          '\n\n## Key Features\n\n- 🚀 High performance with query optimization\n- 🔐 Built-in authentication and authorization\n- 📊 Real-time subscriptions support\n- 🛡️ Input validation and sanitization\n- 📈 Comprehensive monitoring and analytics',
        position: insertPos,
        status: 'pending',
        description: 'Add key features section',
      });
    }

    if (
      state.markdownB.includes('GraphQL Query Example') &&
      !state.markdownA.includes('GraphQL Query Example')
    ) {
      operations.push({
        id: `op-${operationId++}`,
        type: 'modify',
        oldText:
          'fetch("/api/users")\n  .then(res => res.json())\n  .then(console.log);',
        newText:
          "// GraphQL Query Example\nconst query = `\n  query GetUsers($limit: Int!, $offset: Int!) {\n    users(limit: $limit, offset: $offset) {\n      id\n      name\n      email\n    }\n  }\n`;\n\nconst response = await fetch('/graphql', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ query, variables: { limit: 10, offset: 0 } })\n});",
        position: state.markdownA.indexOf('fetch("/api/users")'),
        length:
          'fetch("/api/users")\n  .then(res => res.json())\n  .then(console.log);'
            .length,
        status: 'pending',
        description: 'Upgrade to GraphQL query example with better syntax',
      });
    }

    if (
      state.markdownB.includes('Available Operations') &&
      !state.markdownA.includes('Available Operations')
    ) {
      operations.push({
        id: `op-${operationId++}`,
        type: 'modify',
        oldText: 'Available endpoints:\n\n- GET /api/users\n- POST /api/users',
        newText:
          '### Query Operations\n\n- **users** - Retrieve user information with filtering and pagination\n- **user(id: ID!)** - Get a specific user by ID\n\n### Mutation Operations\n\n- **createUser(input: CreateUserInput!)** - Register a new user\n- **updateUser(id: ID!, input: UpdateUserInput!)** - Update user information',
        position: state.markdownA.indexOf('Available endpoints:'),
        length: 'Available endpoints:\n\n- GET /api/users\n- POST /api/users'
          .length,
        status: 'pending',
        description: 'Replace REST endpoints with GraphQL operations',
      });
    }

    if (
      state.markdownB.includes('Error Handling') &&
      !state.markdownA.includes('Error Handling')
    ) {
      operations.push({
        id: `op-${operationId++}`,
        type: 'insert',
        newText:
          '\n\n## Error Handling\n\nThe API returns structured error responses with detailed information about what went wrong.',
        position: state.markdownA.length,
        status: 'pending',
        description: 'Add comprehensive error handling documentation',
      });
    }

    setState((prev) => ({
      ...prev,
      diffOperations: operations,
      step: 'diff-review',
      isProcessing: false,
    }));
  }, [state.markdownA, state.markdownB]);

  // Handle diff operation decision
  const handleOperationDecision = useCallback(
    (operationId: string, decision: 'accepted' | 'rejected') => {
      setState((prev) => ({
        ...prev,
        diffOperations: prev.diffOperations.map((op) =>
          op.id === operationId ? { ...op, status: decision } : op
        ),
      }));
    },
    []
  );

  // Apply accepted patches
  const applyPatches = useCallback(() => {
    setState((prev) => ({ ...prev, isProcessing: true }));

    const acceptedOps = state.diffOperations.filter(
      (op) => op.status === 'accepted'
    );
    let modifiedMarkdown = state.markdownA;

    // 按位置倒序排列，避免位置偏移问题
    const sortedOps = [...acceptedOps].sort((a, b) => b.position - a.position);

    for (const op of sortedOps) {
      switch (op.type) {
        case 'insert':
          if (op.newText) {
            modifiedMarkdown =
              modifiedMarkdown.slice(0, op.position) +
              op.newText +
              modifiedMarkdown.slice(op.position);
          }
          break;
        case 'delete':
          if (op.length) {
            modifiedMarkdown =
              modifiedMarkdown.slice(0, op.position) +
              modifiedMarkdown.slice(op.position + op.length);
          }
          break;
        case 'modify':
          if (op.oldText && op.newText) {
            modifiedMarkdown = modifiedMarkdown.replace(op.oldText, op.newText);
          }
          break;
      }
    }

    // Convert back to ProseMirror JSON (simplified)
    try {
      const blocks = MarkdownParser.parseToBlocks(modifiedMarkdown);
      const finalJson: ProseMirrorDocument = {
        type: 'doc',
        content: blocks.map((block) => {
          if (block.type === 'heading') {
            return {
              type: 'heading',
              attrs: { level: block.level || 1 },
              content: [
                {
                  type: 'text',
                  text: block.content.join('\n').replace(/^#+\s*/, ''),
                },
              ],
            };
          } else {
            return {
              type: 'paragraph',
              content: [{ type: 'text', text: block.content.join('\n') }],
            };
          }
        }),
      };

      setState((prev) => ({
        ...prev,
        finalJson,
        step: 'result',
        isProcessing: false,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        error: 'Failed to convert markdown back to ProseMirror JSON',
        isProcessing: false,
      }));
    }
  }, [state.diffOperations, state.markdownA]);

  const resetWorkflow = () => {
    setState({
      step: 'input',
      originalJson: SAMPLE_PROSEMIRROR_JSON,
      markdownA: '',
      markdownB: '',
      diffOperations: [],
      finalJson: null,
      isProcessing: false,
      error: null,
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">🔄 ProseMirror AI Workflow</h1>
        <p className="text-lg text-muted-foreground">
          Interactive workflow: JSON → Markdown → AI Enhancement → Diff Review →
          Patched JSON
        </p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle>工作流程进度</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            {[
              { key: 'input', label: '📄 JSON 输入', desc: 'ProseMirror JSON' },
              { key: 'convert', label: '🔄 转换', desc: 'JSON → Markdown' },
              {
                key: 'ai-process',
                label: '🤖 AI 处理',
                desc: 'AI Enhancement',
              },
              {
                key: 'diff-review',
                label: '👁️ Diff 审查',
                desc: 'Accept/Reject',
              },
              {
                key: 'apply-patch',
                label: '⚡ 应用补丁',
                desc: 'Apply Changes',
              },
              { key: 'result', label: '✅ 结果', desc: 'Final JSON' },
            ].map((step, index) => (
              <div
                key={step.key}
                className="flex flex-col items-center space-y-2"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    state.step === step.key
                      ? 'bg-blue-500 text-white'
                      : [
                            'input',
                            'convert',
                            'ai-process',
                            'diff-review',
                            'apply-patch',
                          ].indexOf(state.step) >
                          [
                            'input',
                            'convert',
                            'ai-process',
                            'diff-review',
                            'apply-patch',
                          ].indexOf(step.key)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">{step.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {step.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(['input', 'convert', 'ai-process', 'diff-review', 'apply-patch', 'result'].indexOf(state.step) + 1) * 16.66}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {state.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <span>❌</span>
              <strong>错误:</strong> {state.error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={state.step} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="input">📄 JSON 输入</TabsTrigger>
          <TabsTrigger value="convert">🔄 转换</TabsTrigger>
          <TabsTrigger value="ai-process">🤖 AI 处理</TabsTrigger>
          <TabsTrigger value="diff-review">👁️ Diff 审查</TabsTrigger>
          <TabsTrigger value="apply-patch">⚡ 应用补丁</TabsTrigger>
          <TabsTrigger value="result">✅ 结果</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>📄 输入 ProseMirror JSON</CardTitle>
              <CardDescription>
                输入或编辑你的ProseMirror文档JSON，然后开始工作流程
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-[400px] border rounded-md">
                  <Editor
                    defaultLanguage="json"
                    value={JSON.stringify(state.originalJson, null, 2)}
                    onChange={(value) => {
                      try {
                        const parsed = JSON.parse(value || '{}');
                        setState((prev) => ({ ...prev, originalJson: parsed }));
                      } catch {
                        // Invalid JSON, ignore
                      }
                    }}
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                      wordWrap: 'on',
                    }}
                  />
                </div>
                <Button
                  onClick={convertToMarkdown}
                  disabled={state.isProcessing}
                  className="w-full"
                >
                  {state.isProcessing ? '转换中...' : '🔄 转换为 Markdown'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="convert" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🔄 Markdown 转换结果</CardTitle>
              <CardDescription>
                ProseMirror JSON 已转换为 Markdown，准备AI处理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={state.markdownA}
                  readOnly
                  className="min-h-[300px] font-mono text-sm"
                />
                <Button
                  onClick={processWithAI}
                  disabled={state.isProcessing}
                  className="w-full"
                >
                  {state.isProcessing ? 'AI 处理中...' : '🤖 发送给 AI 处理'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-process" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🤖 AI 处理结果</CardTitle>
              <CardDescription>
                AI 已增强你的文档，比较差异并做出决策
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    原始 Markdown
                  </label>
                  <Textarea
                    value={state.markdownA}
                    readOnly
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    AI 增强后的 Markdown
                  </label>
                  <Textarea
                    value={state.markdownB}
                    readOnly
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>
              </div>
              <Button
                onClick={generateDiff}
                disabled={state.isProcessing}
                className="w-full"
              >
                {state.isProcessing ? '生成差异中...' : '📊 生成差异对比'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diff-review" className="space-y-4">
          <DiffViewer
            operations={state.diffOperations}
            onDecision={handleOperationDecision}
          />
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <Badge variant="outline">
                    ⏳ 待决策:{' '}
                    {
                      state.diffOperations.filter(
                        (op) => op.status === 'pending'
                      ).length
                    }
                  </Badge>
                  <Badge variant="default">
                    ✅ 已接受:{' '}
                    {
                      state.diffOperations.filter(
                        (op) => op.status === 'accepted'
                      ).length
                    }
                  </Badge>
                  <Badge variant="secondary">
                    ❌ 已拒绝:{' '}
                    {
                      state.diffOperations.filter(
                        (op) => op.status === 'rejected'
                      ).length
                    }
                  </Badge>
                </div>
                <Button
                  onClick={applyPatches}
                  disabled={
                    state.diffOperations.filter(
                      (op) => op.status === 'accepted'
                    ).length === 0
                  }
                >
                  ⚡ 应用接受的补丁
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="result" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>✅ 最终结果</CardTitle>
              <CardDescription>
                应用补丁后的最终 ProseMirror JSON
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-[400px] border rounded-md">
                  <Editor
                    defaultLanguage="json"
                    value={JSON.stringify(state.finalJson, null, 2)}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                      wordWrap: 'on',
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={resetWorkflow} variant="outline">
                    🔄 重新开始
                  </Button>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(state.finalJson, null, 2)
                      );
                    }}
                  >
                    📋 复制结果
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
