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
import { Badge } from '@/components/ui/badge';
import { Editor } from '@monaco-editor/react';
import type { ProseMirrorDocument } from 'markdown-diff-prosemirror';
import MarkdownDiffProseMirrorTransformer, {
  proseMirrorToMarkdown,
  DefaultCustomConverters,
  createCustomConverter,
  mergeCustomConverters,
} from 'markdown-diff-prosemirror';
interface SimpleWorkflowState {
  step: 'input' | 'edit-markdown' | 'processing' | 'result';
  originalJson: ProseMirrorDocument | null;
  originalMarkdown: string;
  modifiedMarkdown: string;
  finalJson: ProseMirrorDocument | null;
  isProcessing: boolean;
  error: string | null;
}

// 测试 bullet_list 的示例文档
const BULLET_LIST_SAMPLE: ProseMirrorDocument = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Notta Features' }],
    },
    {
      type: 'bullet_list',
      content: [
        {
          type: 'list_item',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  text: 'Transcribes your conversations to text in real-time\n',
                  type: 'text',
                  marks: [
                    {
                      type: 'textStyle',
                      attrs: {
                        color: 'rgb(5, 8, 13)',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'list_item',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  text: 'Lets you easily review, edit, and highlight meeting notes for accuracy and flow with built-in tools\n',
                  type: 'text',
                  marks: [
                    {
                      type: 'textStyle',
                      attrs: {
                        color: 'rgb(5, 8, 13)',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'list_item',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  text: 'Uses AI algorithms to ',
                  type: 'text',
                  marks: [
                    {
                      type: 'textStyle',
                      attrs: {
                        color: 'rgb(5, 8, 13)',
                      },
                    },
                  ],
                },
                {
                  text: 'generate a meeting summary',
                  type: 'text',
                  marks: [
                    {
                      type: 'link',
                      attrs: {
                        href: 'https://www.notta.ai/en/features/ai-summary',
                        uuid: null,
                        anchor: null,
                        custom: null,
                        target: '_blank',
                        linktype: 'url',
                      },
                    },
                    {
                      type: 'textStyle',
                      attrs: {
                        color: 'rgb(48, 137, 240)',
                      },
                    },
                  ],
                },
                {
                  text: ' in seconds\n',
                  type: 'text',
                  marks: [
                    {
                      type: 'textStyle',
                      attrs: {
                        color: 'rgb(5, 8, 13)',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

// 简单示例文档 - 包含一些可以添加链接的内容
const SIMPLE_SAMPLE: ProseMirrorDocument = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Voice Recording and Transcription' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Using your phone to take notes and record conversations can be frustrating. It can be hard to transcribe those notes later on.',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Fortunately, there are many speech-to-text tools available. Notta is one of the popular options for voice transcription.',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'These tools can help you record audio and transcribe it automatically in real-time.',
        },
      ],
    },
  ],
};

// 包含自定义节点的示例文档
const CUSTOM_NODE_SAMPLE: ProseMirrorDocument = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [
        { type: 'text', text: 'Notta Features with Custom Components' },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Notta offers powerful features for meeting transcription and note-taking.',
        },
      ],
    },
    {
      type: 'blok',
      attrs: {
        id: 'feature-1',
        body: [
          {
            _uid: 'anchor-1',
            component: 'anchor',
            description: 'Real-time transcription with 99% accuracy',
          },
        ],
      },
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'The AI-powered features help you focus on the conversation while taking comprehensive notes.',
        },
      ],
    },
    {
      type: 'blok',
      attrs: {
        id: 'feature-2',
        body: [
          {
            _uid: 'video-1',
            component: 'video embed code',
            code: 'console.log("Notta AI Summary Feature");',
          },
        ],
      },
    },
  ],
};

export function SimpleAIWorkflow() {
  const [state, setState] = useState<SimpleWorkflowState>({
    step: 'input',
    originalJson: SIMPLE_SAMPLE,
    originalMarkdown: '',
    modifiedMarkdown: '',
    finalJson: null,
    isProcessing: false,
    error: null,
  });

  // Step 1: JSON → Markdown
  const convertToMarkdown = useCallback(async () => {
    if (!state.originalJson) {
      setState((prev) => ({ ...prev, error: 'No ProseMirror JSON provided' }));
      return;
    }

    setState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      console.log('📝 转换为 Markdown...');

      // 创建自定义转换器来处理 blok 节点
      const customConverters = createCustomConverter('blok', (node) => {
        const attrs = node.attrs || {};
        const id = attrs.id || 'unknown';

        return `<!-- Blok: ${id} -->\n`;
      });

      // 使用自定义转换器
      const originalMarkdown = proseMirrorToMarkdown(
        state.originalJson,
        customConverters
      );
      console.log('✅ 原始 Markdown (使用自定义转换器):', originalMarkdown);

      setState((prev) => ({
        ...prev,
        originalMarkdown,
        modifiedMarkdown: originalMarkdown, // 初始化为原始内容，供用户编辑
        step: 'edit-markdown',
        isProcessing: false,
      }));
    } catch (error: unknown) {
      console.error('❌ 转换失败:', error);
      setState((prev) => ({
        ...prev,
        error: (error as Error).message || 'Conversion failed',
        isProcessing: false,
      }));
    }
  }, [state.originalJson]);

  // Step 2: 应用用户的Markdown变更
  const applyChanges = useCallback(async () => {
    setState((prev) => ({ ...prev, isProcessing: true, step: 'processing' }));

    try {
      console.log('🔧 使用库核心功能进行转换...');
      console.log('原始 Markdown:', state.originalMarkdown);
      console.log('修改后 Markdown:', state.modifiedMarkdown);

      // 🎯 使用库的核心功能直接转换
      const finalJson =
        await MarkdownDiffProseMirrorTransformer.transformDocument(
          state.originalMarkdown, // 原始 Markdown
          state.modifiedMarkdown, // 用户修改后的 Markdown
          state.originalJson! // 原始 ProseMirror 文档
        );

      console.log('✅ 转换完成！最终 JSON:', finalJson);

      setState((prev) => ({
        ...prev,
        finalJson,
        step: 'result',
        isProcessing: false,
      }));

      console.log('🎉 人工编辑工作流程完成！');
    } catch (error: unknown) {
      console.error('❌ 处理失败:', error);
      setState((prev) => ({
        ...prev,
        error: (error as Error).message || 'Processing failed',
        isProcessing: false,
        step: 'edit-markdown',
      }));
    }
  }, [state.originalMarkdown, state.modifiedMarkdown, state.originalJson]);

  // 重置工作流程
  const resetWorkflow = useCallback(() => {
    setState({
      step: 'input',
      originalJson: SIMPLE_SAMPLE,
      originalMarkdown: '',
      modifiedMarkdown: '',
      finalJson: null,
      isProcessing: false,
      error: null,
    });
  }, []);

  // 检查文档是否有变化
  const documentsAreDifferent =
    state.originalJson &&
    state.finalJson &&
    JSON.stringify(state.originalJson) !== JSON.stringify(state.finalJson);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* 标题 */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">🚀 简单人工编辑工作流</h1>
        <p className="text-lg text-muted-foreground">
          基于库核心功能：手动编辑 Markdown，支持自定义节点转换器
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <div className="text-sm text-green-600 bg-green-50 inline-block px-3 py-1 rounded-full">
            ✨ 使用 MarkdownDiffProseMirrorTransformer.transformDocument()
          </div>
          <div className="text-sm text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-full">
            🔧 支持自定义节点转换器
          </div>
        </div>
      </div>

      {/* 进度指示器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-8">
            {[
              {
                key: 'input',
                label: '📄 输入 JSON',
                active: state.step === 'input',
              },
              {
                key: 'edit-markdown',
                label: '✏️ 编辑 Markdown',
                active: state.step === 'edit-markdown',
              },
              {
                key: 'processing',
                label: '🔧 应用变更',
                active: state.step === 'processing',
              },
              {
                key: 'result',
                label: '✅ 查看结果',
                active: state.step === 'result',
              },
            ].map((step) => (
              <div
                key={step.key}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
                  step.active
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
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

      {/* 输入阶段 */}
      {state.step === 'input' && (
        <Card>
          <CardHeader>
            <CardTitle>📄 输入 ProseMirror JSON</CardTitle>
            <CardDescription>
              输入或编辑你的 ProseMirror 文档 JSON，然后一键处理
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
                      setState((prev) => ({
                        ...prev,
                        originalJson: parsed,
                        error: null,
                      }));
                    } catch (error) {
                      console.warn('Invalid JSON:', error);
                    }
                  }}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    wordWrap: 'on',
                    formatOnPaste: true,
                    formatOnType: true,
                  }}
                />
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        originalJson: SIMPLE_SAMPLE,
                      }))
                    }
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    📝 加载简单示例
                  </Button>
                  <Button
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        originalJson: BULLET_LIST_SAMPLE,
                      }))
                    }
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    🔘 测试 Bullet List
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        originalJson: CUSTOM_NODE_SAMPLE,
                      }))
                    }
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    🧩 测试自定义节点 (Blok)
                  </Button>
                </div>
                <Button
                  onClick={convertToMarkdown}
                  disabled={state.isProcessing || !state.originalJson}
                  className="w-full"
                  size="lg"
                >
                  {state.isProcessing ? '📝 转换中...' : '🔄 转换为 Markdown'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 编辑 Markdown 阶段 */}
      {state.step === 'edit-markdown' && (
        <Card>
          <CardHeader>
            <CardTitle>✏️ 编辑 Markdown</CardTitle>
            <CardDescription>
              在右侧编辑Markdown内容，然后应用变更来查看库的转换效果
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* 原始 Markdown */}
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700">
                  📄 原始 Markdown（只读）
                </label>
                <div className="h-[400px] border rounded-md">
                  <Editor
                    value={state.originalMarkdown}
                    language="markdown"
                    theme="vs-light"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                      wordWrap: 'on',
                    }}
                  />
                </div>
              </div>

              {/* 编辑 Markdown */}
              <div>
                <label className="text-sm font-medium mb-2 block text-blue-700">
                  ✏️ 编辑 Markdown（可修改）
                </label>
                <div className="h-[400px] border rounded-md">
                  <Editor
                    value={state.modifiedMarkdown}
                    language="markdown"
                    theme="vs-light"
                    onChange={(value) => {
                      setState((prev) => ({
                        ...prev,
                        modifiedMarkdown: value || '',
                      }));
                    }}
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                      wordWrap: 'on',
                      formatOnPaste: true,
                      formatOnType: true,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* 提示信息 */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500">💡</span>
                  <div className="text-sm text-blue-700">
                    <strong>编辑提示：</strong>
                    你可以在右侧修改Markdown内容，比如添加链接、修改文字、增加段落等。
                    修改完成后点击&quot;应用变更&quot;，库会自动计算差异并生成新的ProseMirror
                    JSON。
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-4">
                <Button
                  onClick={() =>
                    setState((prev) => ({ ...prev, step: 'input' }))
                  }
                  variant="outline"
                  className="flex-1"
                >
                  ← 返回JSON编辑
                </Button>
                <Button
                  onClick={applyChanges}
                  disabled={
                    state.isProcessing ||
                    state.originalMarkdown === state.modifiedMarkdown
                  }
                  className="flex-1"
                  size="lg"
                >
                  {state.isProcessing ? '🔧 应用中...' : '🚀 应用变更'}
                </Button>
              </div>

              {/* 变更提示 */}
              {state.originalMarkdown !== state.modifiedMarkdown && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <span>✅</span>
                    <span className="text-sm">
                      检测到Markdown变更，可以点击&quot;应用变更&quot;查看库的转换效果
                    </span>
                  </div>
                </div>
              )}

              {state.originalMarkdown === state.modifiedMarkdown && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <span>⚠️</span>
                    <span className="text-sm">
                      内容未修改，请在右侧编辑器中修改Markdown内容
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 处理中阶段 */}
      {state.step === 'processing' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <h3 className="text-xl font-semibold">🔧 正在应用你的变更...</h3>
              <p className="text-gray-500">
                正在使用库的核心功能计算差异并转换，请稍候...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 结果阶段 */}
      {state.step === 'result' && (
        <div className="space-y-6">
          {/* 结果摘要 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ✅ 处理完成
                {documentsAreDifferent ? (
                  <Badge variant="default">📝 文档已修改</Badge>
                ) : (
                  <Badge variant="secondary">📄 文档无变化</Badge>
                )}
              </CardTitle>
              <CardDescription>
                人工编辑处理已完成，使用了库的 transformDocument() 方法
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Markdown 对比 */}
          <Card>
            <CardHeader>
              <CardTitle>📝 Markdown 对比</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="bg-gray-50 border-b px-4 py-2 text-sm font-medium">
                    📄 原始 Markdown
                  </div>
                  <div className="h-[300px] border rounded-b-md">
                    <Editor
                      value={state.originalMarkdown}
                      language="markdown"
                      theme="vs-light"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        wordWrap: 'on',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="bg-blue-50 border-b px-4 py-2 text-sm font-medium">
                    ✏️ 你修改后的 Markdown
                  </div>
                  <div className="h-[300px] border rounded-b-md">
                    <Editor
                      value={state.modifiedMarkdown}
                      language="markdown"
                      theme="vs-light"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        wordWrap: 'on',
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* JSON 结果对比 */}
          <Card>
            <CardHeader>
              <CardTitle>📊 ProseMirror JSON 结果</CardTitle>
              <CardDescription>
                原始 JSON vs 库转换后的最终 JSON
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="bg-gray-50 border-b px-4 py-2 text-sm font-medium">
                    📄 原始 JSON
                  </div>
                  <div className="h-[400px] border rounded-b-md">
                    <Editor
                      value={JSON.stringify(state.originalJson, null, 2)}
                      language="json"
                      theme="vs-light"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 12,
                        wordWrap: 'on',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div
                    className={`border-b px-4 py-2 text-sm font-medium ${
                      documentsAreDifferent
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    {documentsAreDifferent
                      ? '✨ 修改后 JSON (已变更)'
                      : '📄 最终 JSON (无变化)'}
                  </div>
                  <div className="h-[400px] border rounded-b-md">
                    <Editor
                      value={JSON.stringify(state.finalJson, null, 2)}
                      language="json"
                      theme="vs-light"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 12,
                        wordWrap: 'on',
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 justify-center">
                <Button onClick={resetWorkflow} variant="outline">
                  🔄 重新开始
                </Button>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(state.finalJson, null, 2)
                    );
                  }}
                  variant="default"
                >
                  📋 复制最终 JSON
                </Button>
                <Button
                  onClick={() => {
                    const blob = new Blob(
                      [JSON.stringify(state.finalJson, null, 2)],
                      { type: 'application/json' }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'ai-enhanced.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  variant="outline"
                >
                  💾 下载 JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>📖 使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-blue-500">1️⃣</span>
              <div>
                <strong>输入文档：</strong> 输入或编辑你的 ProseMirror JSON 文档
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500">2️⃣</span>
              <div>
                <strong>编辑 Markdown：</strong>{' '}
                在左右对比编辑器中手动修改Markdown内容（比如添加链接：
                <code>[Notta](https://www.notta.ai)</code>）
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500">3️⃣</span>
              <div>
                <strong>应用变更：</strong>
                点击&quot;应用变更&quot;，库的{' '}
                <code>
                  MarkdownDiffProseMirrorTransformer.transformDocument()
                </code>
                会自动计算差异并生成最终的 ProseMirror JSON
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500">4️⃣</span>
              <div>
                <strong>查看结果：</strong>{' '}
                对比原始和最终的文档，查看库如何精确地将你的Markdown变更转换为ProseMirror操作
              </div>
            </div>

            {/* 编辑建议 */}
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-700">
                <strong>💡 编辑建议：</strong>
                <div className="mt-2 space-y-1">
                  <div>
                    • 添加链接：<code>[Notta](https://www.notta.ai)</code>
                  </div>
                  <div>
                    • 添加粗体：<code>**speech-to-text**</code>
                  </div>
                  <div>• 添加新段落或修改现有文字</div>
                  <div>
                    • 添加标题：<code>## New Section</code>
                  </div>
                  <div>
                    • 测试自定义节点：点击&quot;🧩 测试自定义节点
                    (Blok)&quot;按钮
                  </div>
                </div>
              </div>
            </div>

            {/* 自定义转换器说明 */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-700">
                <strong>🔧 自定义转换器功能：</strong>
                <div className="mt-2 space-y-1">
                  <div>
                    • 本示例使用自定义转换器处理 <code>blok</code> 节点
                  </div>
                  <div>
                    • 自定义节点会转换为 HTML 注释格式：
                    <code>&lt;!-- Blok: id --&gt;</code>
                  </div>
                  <div>
                    • 支持 <code>anchor</code>、<code>video embed code</code>{' '}
                    等组件类型
                  </div>
                  <div>
                    • 可以自定义任何 ProseMirror 节点类型的 Markdown 输出格式
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
