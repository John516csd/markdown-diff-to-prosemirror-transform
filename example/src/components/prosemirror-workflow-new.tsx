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
// Alert组件暂时用Card替代
import { Editor } from '@monaco-editor/react';
import * as Diff from 'diff';
import type { ProseMirrorDocument } from 'markdown-diff-prosemirror';
import {
  ProseMirrorToMarkdown,
  MarkdownToProseMirror,
} from './prosemirror-converter';
import { RealAIProcessor } from './real-ai-processor';
import { VSCodeDiffViewer } from './vscode-diff-viewer';

interface DiffChange extends Diff.Change {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  lineNumber: number;
  endLineNumber: number;
}

interface WorkflowState {
  step: 'input' | 'processing' | 'diff' | 'result';
  originalJson: ProseMirrorDocument | null;
  originalMarkdown: string;
  enhancedMarkdown: string;
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
      attrs: {
        level: 4,
      },
      content: [
        {
          text: 'Using your phone to ',
          type: 'text',
        },
        {
          text: 'take notes',
          type: 'text',
          marks: [
            {
              type: 'bold',
            },
          ],
        },
        {
          text: ' and ',
          type: 'text',
        },
        {
          text: 'record',
          type: 'text',
          marks: [
            {
              type: 'bold',
            },
          ],
        },
        {
          text: ' conversations can be frustrating. It can be hard to ',
          type: 'text',
        },
        {
          text: 'transcribe',
          type: 'text',
          marks: [
            {
              type: 'bold',
            },
          ],
        },
        {
          text: ' those notes later on. ',
          type: 'text',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          text: 'Fortunately, there are plenty of ways to get around this problem. You can use advanced voice recording technology and ',
          type: 'text',
        },
        {
          text: 'speech-to-text',
          type: 'text',
          marks: [
            {
              type: 'bold',
            },
          ],
        },
        {
          text: ' tools. Notta may be useful to you in your professional life as well as your personal life. ',
          type: 'text',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          text: 'The app allows you to ',
          type: 'text',
        },
        {
          text: 'record audio',
          type: 'text',
          marks: [
            {
              type: 'bold',
            },
          ],
        },
        {
          text: " using your phone's built-in microphone or an external one. Then it will ",
          type: 'text',
        },
        {
          text: 'transcribe',
          type: 'text',
          marks: [
            {
              type: 'bold',
            },
          ],
        },
        {
          text: ' it in ',
          type: 'text',
        },
        {
          text: 'real-time',
          type: 'text',
          marks: [
            {
              type: 'bold',
            },
          ],
        },
        {
          text: ". It's ",
          type: 'text',
        },
        {
          text: 'free',
          type: 'text',
          marks: [
            {
              type: 'bold',
            },
          ],
        },
        {
          text: ' to download. ',
          type: 'text',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          text: 'The transcription process is very impressive. It is more reliable than any other app. All of your recordings are stored in the cloud. Then you can review any information from a computer at any time. Even if you recorded it on your phone. You can also ',
          type: 'text',
        },
        {
          text: 'transcribe voice memos to text',
          type: 'text',
          marks: [
            {
              type: 'link',
              attrs: {
                href: 'https://www.notta.ai/en/voice-memos-to-text',
                uuid: null,
                anchor: null,
                custom: null,
                target: '_self',
                linktype: 'url',
              },
            },
          ],
        },
        {
          text: ' with Notta.',
          type: 'text',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          text: 'With ',
          type: 'text',
        },
        {
          text: 'multi-terminal synchronization',
          type: 'text',
          marks: [
            {
              type: 'bold',
            },
          ],
        },
        {
          text: ', any device can send a file to any other device. It can do so automatically. Also, Notta can also be used to ',
          type: 'text',
        },
        {
          text: 'record audio on iPhone',
          type: 'text',
          marks: [
            {
              type: 'link',
              attrs: {
                href: 'https://www.notta.ai/en/blog/how-to-record-audio-on-iphone',
                uuid: null,
                anchor: null,
                custom: null,
                target: '_blank',
                linktype: 'url',
              },
            },
          ],
        },
        {
          text: '. ',
          type: 'text',
        },
      ],
    },
  ],
};

export function ProseMirrorWorkflowNew() {
  const [state, setState] = useState<WorkflowState>({
    step: 'input',
    originalJson: SAMPLE_PROSEMIRROR_JSON,
    originalMarkdown: '',
    enhancedMarkdown: '',
    finalJson: null,
    isProcessing: false,
    error: null,
  });

  // 主要处理流程：JSON → Markdown → AI → Diff
  const processWithAI = useCallback(async () => {
    if (!state.originalJson) {
      setState((prev) => ({ ...prev, error: 'No ProseMirror JSON provided' }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isProcessing: true,
      error: null,
      step: 'processing',
    }));

    try {
      console.log('🔄 开始处理流程...');

      // Step 1: 转换 ProseMirror JSON 到 Markdown
      console.log('📝 转换为 Markdown...');
      const converter = new ProseMirrorToMarkdown();
      const originalMarkdown = converter.convert(state.originalJson);
      console.log('原始 Markdown:', originalMarkdown);

      // Step 2: AI 处理
      console.log('🤖 AI 处理中...');
      const aiProcessor = new RealAIProcessor({
        model: 'mercury-coder-small',
        max_tokens: 2000,
        temperature: 0.3,
      });

      const enhancedMarkdown = await aiProcessor.enhance(originalMarkdown);
      console.log('增强后 Markdown:', enhancedMarkdown);

      setState((prev) => ({
        ...prev,
        originalMarkdown,
        enhancedMarkdown,
        step: 'diff',
        isProcessing: false,
      }));

      console.log('✅ 处理完成，进入 diff 阶段');
    } catch (error: unknown) {
      console.error('❌ 处理失败:', error);
      setState((prev) => ({
        ...prev,
        error: (error as Error).message || 'Processing failed',
        isProcessing: false,
        step: 'input', // 回到输入阶段
      }));
    }
  }, [state.originalJson]);

  // 应用用户选择的变更
  const applyChanges = useCallback(
    async (acceptedChanges: DiffChange[]) => {
      setState((prev) => ({ ...prev, isProcessing: true }));

      try {
        console.log('⚡ 应用变更...');
        console.log('接受的变更:', acceptedChanges);

        // 构建最终的 Markdown（应用用户接受的变更）
        let finalMarkdown = state.originalMarkdown;

        // 按行应用变更
        const originalLines = state.originalMarkdown.split('\n');
        // const enhancedLines = state.enhancedMarkdown.split('\n');
        const finalLines = [...originalLines];

        // 对于接受的变更，用增强版本的内容替换
        acceptedChanges.forEach((change) => {
          if (change.added && change.value) {
            const linesToAdd = change.value
              .split('\n')
              .filter((line) => line !== '');
            linesToAdd.forEach((line, index) => {
              finalLines.splice(change.lineNumber + index, 0, line);
            });
          }
          // 对于删除的变更，我们保持原始内容（因为用户接受了删除）
        });

        finalMarkdown = finalLines.join('\n');
        console.log('最终 Markdown:', finalMarkdown);

        // Step 3: 转换回 ProseMirror JSON
        console.log('🔄 转换回 ProseMirror JSON...');
        const backConverter = new MarkdownToProseMirror();
        const finalJson = backConverter.convert(finalMarkdown);

        console.log('最终 JSON:', finalJson);

        setState((prev) => ({
          ...prev,
          finalJson,
          step: 'result',
          isProcessing: false,
        }));

        console.log('✅ 变更应用完成');
      } catch (error: unknown) {
        console.error('❌ 应用变更失败:', error);
        setState((prev) => ({
          ...prev,
          error: (error as Error).message || 'Failed to apply changes',
          isProcessing: false,
        }));
      }
    },
    [state.originalMarkdown]
  );

  // 重置工作流程
  const resetWorkflow = useCallback(() => {
    setState({
      step: 'input',
      originalJson: SAMPLE_PROSEMIRROR_JSON,
      originalMarkdown: '',
      enhancedMarkdown: '',
      finalJson: null,
      isProcessing: false,
      error: null,
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 标题 */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">🤖 AI 文档增强工作流</h1>
        <p className="text-lg text-muted-foreground">
          输入 ProseMirror JSON → AI 增强 → 差异对比 → 应用变更
        </p>
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
                key: 'processing',
                label: '🤖 AI 处理',
                active: state.step === 'processing',
              },
              {
                key: 'diff',
                label: '📊 差异对比',
                active: state.step === 'diff',
              },
              {
                key: 'result',
                label: '✅ 完成',
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

      {/* 主要内容区域 */}
      {state.step === 'input' && (
        <Card>
          <CardHeader>
            <CardTitle>📄 输入 ProseMirror JSON</CardTitle>
            <CardDescription>
              输入或编辑你的 ProseMirror 文档 JSON，然后点击开始处理
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-[500px] border rounded-md">
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
                      // JSON 解析错误，不更新状态但可以显示错误
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
              <Button
                onClick={processWithAI}
                disabled={state.isProcessing || !state.originalJson}
                className="w-full"
                size="lg"
              >
                {state.isProcessing ? '🤖 AI 处理中...' : '🚀 开始 AI 增强处理'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === 'processing' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <h3 className="text-xl font-semibold">
                🤖 AI 正在处理你的文档...
              </h3>
              <p className="text-gray-500">
                正在分析内容并生成改进建议，请稍候...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === 'diff' && (
        <VSCodeDiffViewer
          originalText={state.originalMarkdown}
          modifiedText={state.enhancedMarkdown}
          onApplyChanges={applyChanges}
          isProcessing={state.isProcessing}
        />
      )}

      {state.step === 'result' && (
        <Card>
          <CardHeader>
            <CardTitle>✅ 处理完成</CardTitle>
            <CardDescription>
              AI 增强已完成，以下是最终的 ProseMirror JSON
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-[500px] border rounded-md">
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
                <Button
                  onClick={() => {
                    const blob = new Blob(
                      [JSON.stringify(state.finalJson, null, 2)],
                      {
                        type: 'application/json',
                      }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'enhanced-prosemirror.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  variant="outline"
                >
                  💾 下载 JSON
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
