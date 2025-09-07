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
// Alert组件暂时用Card替代
import { Editor } from '@monaco-editor/react';
import type {
  ProseMirrorDocument,
  MarkdownDiffOperation,
} from 'markdown-diff-prosemirror';
import { MarkdownToProseMirrorMapper } from 'markdown-diff-prosemirror';
import { ProseMirrorToMarkdown } from './prosemirror-converter';
import { RealAIProcessor } from './real-ai-processor';
// VSCodeDiffViewer 已被替换为库原生操作界面

// 辅助函数：生成操作的用户友好描述
function generateOperationDescription(
  operation: MarkdownDiffOperation
): string {
  switch (operation.type) {
    case 'insert_node':
      return `插入${operation.nodeType || '节点'} (位置: ${operation.markdownPosition})`;
    case 'delete_node':
      return `删除${operation.nodeType || '节点'} (位置: ${operation.markdownPosition})`;
    case 'replace':
      return `替换内容 (位置: ${operation.markdownPosition}, 长度: ${operation.length || 0})`;
    case 'modify_node':
      return `修改节点 (路径: ${operation.prosemirrorPath?.join('.') || 'unknown'})`;
    default:
      return `操作类型: ${operation.type} (位置: ${operation.markdownPosition})`;
  }
}

// 辅助函数：生成用于显示的文本
function generateDisplayText(operation: MarkdownDiffOperation): string {
  if (operation.content) {
    return operation.content.length > 100
      ? operation.content.substring(0, 100) + '...'
      : operation.content;
  }
  return `操作: ${operation.type}`;
}


// 生成准确的预览 - 基于操作类型的简单模拟
function generateAccuratePreview(
  originalMarkdown: string,
  acceptedOperations: UserDecisionOperation[]
): string {
  console.log('🔧 生成准确的预览，基于', acceptedOperations.length, '个操作');
  
  // 为了避免位置偏移问题，我们使用一种更安全的方法：
  // 显示原始文档 + 将要应用的变更列表
  
  const preview = originalMarkdown;
  let changesSummary = '\n\n---\n\n## ✨ 你选择应用的变更\n\n';
  
  acceptedOperations.forEach((op, index) => {
    changesSummary += `### ${index + 1}. ${getOperationTypeDisplay(op.type)}\n\n`;
    
    switch (op.type) {
      case 'insert_node':
        changesSummary += `**位置**: 字符 ${op.markdownPosition}\n`;
        changesSummary += `**类型**: 插入 ${op.nodeType || '节点'}\n`;
        if (op.content) {
          changesSummary += `**内容**:\n\`\`\`markdown\n${op.content}\n\`\`\`\n\n`;
        }
        break;
        
      case 'delete_node':
        changesSummary += `**位置**: 字符 ${op.markdownPosition}\n`;
        changesSummary += `**类型**: 删除 ${op.nodeType || '节点'}\n`;
        changesSummary += `**长度**: ${op.length} 个字符\n\n`;
        break;
        
      case 'replace':
        changesSummary += `**位置**: 字符 ${op.markdownPosition}\n`;
        changesSummary += `**长度**: ${op.length} 个字符\n`;
        if (op.content) {
          changesSummary += `**新内容**:\n\`\`\`markdown\n${op.content}\n\`\`\`\n\n`;
        }
        break;
        
      case 'modify_node':
        changesSummary += `**路径**: ${op.prosemirrorPath?.join(' → ') || 'unknown'}\n`;
        if (op.content) {
          changesSummary += `**修改内容**: ${op.content.substring(0, 100)}...\n\n`;
        }
        break;
        
      default:
        changesSummary += `**操作**: ${op.type}\n\n`;
    }
  });
  
  changesSummary += `\n> 🎯 **准备应用**: 选中了 ${acceptedOperations.length} 个变更\n`;
  changesSummary += `> 📋 点击&quot;应用决策&quot;按钮后，这些变更会被精确应用到你的ProseMirror文档中\n`;
  
  return preview + changesSummary;
}


// 获取操作类型的显示名称
function getOperationTypeDisplay(type: string): string {
  switch (type) {
    case 'insert_node': return '插入节点';
    case 'delete_node': return '删除节点';
    case 'replace': return '替换内容';
    case 'modify_node': return '修改节点';
    default: return type;
  }
}

// 扩展库的原生操作类型，添加用户决策信息
interface UserDecisionOperation extends MarkdownDiffOperation {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  description: string; // 用户友好的描述
  displayText?: string; // 用于显示的文本
}

interface WorkflowState {
  step: 'input' | 'processing' | 'diff' | 'result';
  originalJson: ProseMirrorDocument | null;
  originalMarkdown: string;
  enhancedMarkdown: string;
  previewMarkdown: string; // 根据用户决策实时计算的预览
  libraryOperations: UserDecisionOperation[]; // 使用库的原生操作
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
    previewMarkdown: '',
    libraryOperations: [],
    finalJson: null,
    isProcessing: false,
    error: null,
  });

  // 主要处理流程：JSON → Markdown → AI → 库计算精确Diff
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

      // Step 3: 🎯 使用库的核心功能计算精确的diff操作
      console.log('🔍 使用库计算精确的diff操作...');
      const transformResult = await MarkdownToProseMirrorMapper.transform(
        originalMarkdown,
        enhancedMarkdown,
        state.originalJson
      );
      console.log(
        '🚀 ~ ProseMirrorWorkflowNew ~ transformResult:',
        transformResult
      );

      if (!transformResult.success) {
        throw new Error(`库计算diff失败: ${transformResult.errors.join(', ')}`);
      }

      // 将库的操作转换为用户决策操作
      const userOperations: UserDecisionOperation[] =
        transformResult.operations.map((op, index) => ({
          ...op,
          id: `op-${index}`,
          status: 'pending' as const,
          description: generateOperationDescription(op),
          displayText: generateDisplayText(op),
        }));

        console.log('✅ 库计算完成，生成了', userOperations.length, '个操作');
        console.log('📊 操作详细信息:', userOperations.map(op => ({
          id: op.id,
          type: op.type,
          position: op.markdownPosition,
          length: op.length,
          nodeType: op.nodeType,
          content: op.content?.substring(0, 100) + '...'
        })));

        // 初始化预览（默认为原始文档，因为还没有接受任何操作）
        const initialPreview = generateAccuratePreview(originalMarkdown, []);

        setState((prev) => ({
          ...prev,
          originalMarkdown,
          enhancedMarkdown,
          libraryOperations: userOperations,
          previewMarkdown: initialPreview,
          step: 'diff',
          isProcessing: false,
        }));
    } catch (error: unknown) {
      console.error('❌ 处理失败:', error);
      setState((prev) => ({
        ...prev,
        error: (error as Error).message || 'Processing failed',
        isProcessing: false,
        step: 'input',
      }));
    }
  }, [state.originalJson]);

  // 🎯 真正有意义的用户决策：只应用用户接受的操作
  const applyUserDecisions = useCallback(
    async (operationId: string, status: 'accepted' | 'rejected') => {
      console.log(`🔄 用户决策：${operationId} -> ${status}`);
      
      setState((prev) => {
        const updatedOperations = prev.libraryOperations.map((op) =>
          op.id === operationId ? { ...op, status } : op
        );
        
        // 🎯 使用真实的库功能生成预览
        generateRealTimePreview(prev.originalMarkdown, prev.originalJson!, updatedOperations)
          .then(previewMarkdown => {
            setState((current) => ({
              ...current,
              previewMarkdown,
            }));
          })
          .catch(error => {
            console.error('预览生成失败:', error);
            // 降级到摘要预览
            const fallbackPreview = generateAccuratePreview(prev.originalMarkdown, updatedOperations.filter(op => op.status === 'accepted'));
            setState((current) => ({
              ...current,
              previewMarkdown: fallbackPreview,
            }));
          });

        return {
          ...prev,
          libraryOperations: updatedOperations,
          // previewMarkdown 会通过异步操作更新
        };
      });
    },
    []
  );

  // 生成实时预览 - 使用库的真实功能
  async function generateRealTimePreview(
    originalMarkdown: string,
    originalJson: ProseMirrorDocument,
    operations: UserDecisionOperation[]
  ): Promise<string> {
    const acceptedOperations = operations.filter(op => op.status === 'accepted');
    
    if (acceptedOperations.length === 0) {
      return originalMarkdown;
    }

    try {
      console.log('🔄 使用库功能生成实时预览...');
      return generateAccuratePreview(originalMarkdown, acceptedOperations);
    } catch (error) {
      console.error('实时预览生成失败:', error);
      throw error;
    }
  }

  // 应用最终决策 - 只应用用户接受的操作
  const applyFinalChanges = useCallback(async () => {
    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      console.log('⚡ 应用用户的最终决策...');

      // 只获取用户接受的操作
      const acceptedOperations = state.libraryOperations.filter(
        (op) => op.status === 'accepted'
      );

      console.log('用户接受了', acceptedOperations.length, '个操作');
      console.log('接受的操作:', acceptedOperations);

      if (acceptedOperations.length === 0) {
        // 用户没有接受任何操作，返回原始文档
        setState((prev) => ({
          ...prev,
          finalJson: prev.originalJson,
          step: 'result',
          isProcessing: false,
        }));
        console.log('✅ 用户未接受任何变更，保持原始文档');
        return;
      }

      // 🎯 使用库的低级API直接应用用户接受的操作
      const finalJson = applyOperationsToDocument(
        state.originalJson!,
        acceptedOperations
      );

      setState((prev) => ({
        ...prev,
        finalJson,
        step: 'result',
        isProcessing: false,
      }));

      console.log('✅ 用户决策应用完成 - 只应用了接受的操作！');
    } catch (error: unknown) {
      console.error('❌ 应用用户决策失败:', error);
      setState((prev) => ({
        ...prev,
        error: (error as Error).message || 'Failed to apply user decisions',
        isProcessing: false,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [state.libraryOperations, state.originalJson]);

  // 🎯 实现真正的操作应用逻辑 - 复制自库的内部实现
  function applyOperationsToDocument(
    document: ProseMirrorDocument,
    operations: UserDecisionOperation[]
  ): ProseMirrorDocument {
    console.log('📝 应用', operations.length, '个操作到文档');
    console.log('🔧 操作详情:', operations);

    const newDoc: ProseMirrorDocument = JSON.parse(JSON.stringify(document));

    // 按路径深度排序，深度大的先处理
    const sortedOps = [...operations].sort((a, b) => {
      const pathA = a.prosemirrorPath || [];
      const pathB = b.prosemirrorPath || [];
      
      if (pathA.length !== pathB.length) {
        return pathB.length - pathA.length;
      }
      
      for (let i = pathA.length - 1; i >= 0; i--) {
        const valA = pathA[i];
        const valB = pathB[i];
        if (valA !== undefined && valB !== undefined && valA !== valB) {
          return valB - valA;
        }
      }
      
      return 0;
    });

    console.log('📋 排序后的操作:', sortedOps.map(op => ({
      type: op.type,
      path: op.prosemirrorPath,
      position: op.markdownPosition
    })));

    // 应用每个操作
    for (const op of sortedOps) {
      try {
        console.log(`🔧 应用操作: ${op.type} at path ${op.prosemirrorPath?.join('.')}`);
        applyOperationToDoc(newDoc, op);
        console.log(`✅ 操作应用成功: ${op.type}`);
      } catch (error) {
        console.warn('❌ 操作应用失败:', op, error);
      }
    }

    console.log('✅ 所有操作应用完成');
    return newDoc;
  }

  // 应用单个操作到文档
  function applyOperationToDoc(
    doc: ProseMirrorDocument,
    operation: UserDecisionOperation
  ): void {
    const path = operation.prosemirrorPath || [];
    
    switch (operation.type) {
      case 'insert_node':
        insertNodeAtPath(doc, path, operation);
        break;
      
      case 'delete_node':
        deleteNodeAtPath(doc, path);
        break;
      
      case 'replace':
        replaceTextAtPath(doc, path, operation);
        break;
      
      case 'modify_node':
        modifyNodeAtPath(doc, path, operation);
        break;
      
      default:
        console.warn('未知操作类型:', operation.type);
    }
  }

  // 在指定路径插入节点
  function insertNodeAtPath(doc: ProseMirrorDocument, path: number[], operation: UserDecisionOperation): void {
    if (path.length === 0) {
      // 插入到根级别
      if (operation.content) {
        try {
          const newNode = JSON.parse(operation.content);
          doc.content = doc.content || [];
          doc.content.push(newNode);
          console.log('✅ 根级别插入成功');
        } catch (error) {
          console.warn('❌ 解析插入内容失败:', error);
        }
      }
      return;
    }

    // 导航到父节点
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = doc;
    for (let i = 0; i < path.length - 1; i++) {
      const index = path[i];
      if (current.content && current.content[index]) {
        current = current.content[index];
      } else {
        console.warn('❌ 路径导航失败:', path, 'at index', i);
        return;
      }
    }

    // 在最后位置插入
    const insertIndex = path[path.length - 1];
    if (current.content && operation.content) {
      try {
        const newNode = JSON.parse(operation.content);
        current.content.splice(insertIndex, 0, newNode);
        console.log('✅ 节点插入成功 at index', insertIndex);
      } catch (error) {
        console.warn('❌ 插入节点失败:', error);
      }
    }
  }

  // 删除指定路径的节点
  function deleteNodeAtPath(doc: ProseMirrorDocument, path: number[]): void {
    if (path.length === 0) {
      console.warn('❌ 不能删除根节点');
      return;
    }

    // 导航到父节点
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = doc;
    for (let i = 0; i < path.length - 1; i++) {
      const index = path[i];
      if (current.content && current.content[index]) {
        current = current.content[index];
      } else {
        console.warn('❌ 删除时路径导航失败:', path, 'at index', i);
        return;
      }
    }

    // 删除节点
    const deleteIndex = path[path.length - 1];
    if (current.content && deleteIndex >= 0 && deleteIndex < current.content.length) {
      current.content.splice(deleteIndex, 1);
      console.log('✅ 节点删除成功 at index', deleteIndex);
    } else {
      console.warn('❌ 删除索引无效:', deleteIndex);
    }
  }

  // 替换指定路径的文本内容
  function replaceTextAtPath(doc: ProseMirrorDocument, path: number[], operation: UserDecisionOperation): void {
    if (path.length === 0 || !operation.content) {
      console.warn('❌ 替换操作路径或内容无效');
      return;
    }

    // 导航到目标节点
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = doc;
    for (const index of path) {
      if (current.content && current.content[index]) {
        current = current.content[index];
      } else {
        console.warn('❌ 替换时路径导航失败:', path);
        return;
      }
    }

    // 替换文本内容
    if (current.type === 'text') {
      current.text = operation.content;
      console.log('✅ 文本替换成功');
    } else {
      console.warn('❌ 目标节点不是文本节点:', current.type);
    }
  }

  // 修改指定路径的节点
  function modifyNodeAtPath(doc: ProseMirrorDocument, path: number[], operation: UserDecisionOperation): void {
    if (path.length === 0) {
      console.warn('❌ 修改操作路径无效');
      return;
    }

    // 导航到目标节点
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = doc;
    for (const index of path) {
      if (current.content && current.content[index]) {
        current = current.content[index];
      } else {
        console.warn('❌ 修改时路径导航失败:', path);
        return;
      }
    }

    // 应用修改
    if (operation.content) {
      try {
        const modifications = JSON.parse(operation.content);
        Object.assign(current, modifications);
        console.log('✅ 节点修改成功');
      } catch (error) {
        console.warn('❌ 解析修改内容失败:', error);
      }
    }
  }

  // 重置工作流程
  const resetWorkflow = useCallback(() => {
    setState({
      step: 'input',
      originalJson: SAMPLE_PROSEMIRROR_JSON,
      originalMarkdown: '',
      enhancedMarkdown: '',
      previewMarkdown: '',
      libraryOperations: [],
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
          使用核心库功能：ProseMirror JSON → AI 增强 → 精确 Diff → Transform
          映射
        </p>
        <div className="text-sm text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-full">
          ✨ 现已集成 MarkdownDiffProseMirrorTransformer 核心功能
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
        <div className="space-y-4">
          {/* 操作列表 */}
          <Card>
            <CardHeader>
              <CardTitle>📊 AI 建议的操作</CardTitle>
              <CardDescription>
                以下是库计算出的精确操作。请逐个决策是否接受每项变更。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {state.libraryOperations.map((operation) => (
                  <div
                    key={operation.id}
                    className={`border rounded-lg p-4 ${
                      operation.status === 'accepted'
                        ? 'border-green-200 bg-green-50'
                        : operation.status === 'rejected'
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            operation.type === 'insert_node'
                              ? 'default'
                              : operation.type === 'delete_node'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {operation.type === 'insert_node'
                            ? '+ 插入节点'
                            : operation.type === 'delete_node'
                              ? '- 删除节点'
                              : operation.type === 'replace'
                                ? '~ 替换内容'
                                : operation.type === 'modify_node'
                                  ? '⚡ 修改节点'
                                  : `📝 ${operation.type}`}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {operation.description}
                        </span>
                        {operation.status !== 'pending' && (
                          <Badge
                            variant={
                              operation.status === 'accepted'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {operation.status === 'accepted'
                              ? '✅ 已接受'
                              : '❌ 已拒绝'}
                          </Badge>
                        )}
                      </div>

                      {operation.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              applyUserDecisions(operation.id, 'accepted')
                            }
                          >
                            ✅ 接受
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              applyUserDecisions(operation.id, 'rejected')
                            }
                          >
                            ❌ 拒绝
                          </Button>
                        </div>
                      )}
                    </div>

                    {operation.displayText && (
                      <div className="font-mono text-sm bg-gray-100 p-3 rounded border-l-4 border-l-blue-500 max-h-32 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">
                          {operation.displayText}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 操作统计和应用 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <Badge variant="outline">
                    ⏳ 待决策:{' '}
                    {
                      state.libraryOperations.filter(
                        (op) => op.status === 'pending'
                      ).length
                    }
                  </Badge>
                  <Badge variant="default">
                    ✅ 已接受:{' '}
                    {
                      state.libraryOperations.filter(
                        (op) => op.status === 'accepted'
                      ).length
                    }
                  </Badge>
                  <Badge variant="secondary">
                    ❌ 已拒绝:{' '}
                    {
                      state.libraryOperations.filter(
                        (op) => op.status === 'rejected'
                      ).length
                    }
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setState((prev) => {
                        const updatedOperations = prev.libraryOperations.map((op) =>
                          op.status === 'pending' ? { ...op, status: 'accepted' as const } : op
                        );
                        const previewMarkdown = generateAccuratePreview(
                          prev.originalMarkdown,
                          updatedOperations.filter(op => op.status === 'accepted')
                        );
                        return {
                          ...prev,
                          libraryOperations: updatedOperations,
                          previewMarkdown,
                        };
                      });
                    }}
                    disabled={
                      state.libraryOperations.filter(
                        (op) => op.status === 'pending'
                      ).length === 0
                    }
                  >
                    ✅ 全部接受
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setState((prev) => {
                        const updatedOperations = prev.libraryOperations.map((op) =>
                          op.status === 'pending' ? { ...op, status: 'rejected' as const } : op
                        );
                        const previewMarkdown = generateAccuratePreview(
                          prev.originalMarkdown,
                          updatedOperations.filter(op => op.status === 'accepted')
                        );
                        return {
                          ...prev,
                          libraryOperations: updatedOperations,
                          previewMarkdown,
                        };
                      });
                    }}
                    disabled={
                      state.libraryOperations.filter(
                        (op) => op.status === 'pending'
                      ).length === 0
                    }
                  >
                    ❌ 全部拒绝
                  </Button>
                  <Button
                    onClick={applyFinalChanges}
                    disabled={
                      state.isProcessing ||
                      state.libraryOperations.every(
                        (op) => op.status === 'pending'
                      )
                    }
                  >
                    {state.isProcessing ? '应用中...' : `🚀 应用决策`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Markdown三栏对比视图 */}
          <Card>
            <CardHeader>
              <CardTitle>📝 Markdown 对比与预览</CardTitle>
              <CardDescription>
                左侧：原始文档 | 中间：AI增强建议 | 右侧：你的决策预览
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 原始文档 */}
                <div>
                  <div className="bg-gray-50 border-b px-4 py-2 text-sm font-medium text-gray-700">
                    📄 原始文档
                  </div>
                  <div className="h-[400px] border rounded-b-md">
                    <Editor
                      value={state.originalMarkdown}
                      language="markdown"
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

                {/* AI增强建议 */}
                <div>
                  <div className="bg-blue-50 border-b px-4 py-2 text-sm font-medium text-blue-700">
                    🤖 AI增强建议
                  </div>
                  <div className="h-[400px] border rounded-b-md">
                    <Editor
                      value={state.enhancedMarkdown}
                      language="markdown"
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

                {/* 实时预览 */}
                <div>
                  <div className="bg-green-50 border-b px-4 py-2 text-sm font-medium text-green-700">
                    📋 变更摘要预览
                    <span className="ml-2 text-xs text-green-600">
                      ({state.libraryOperations.filter(op => op.status === 'accepted').length} 个变更已接受)
                    </span>
                  </div>
                  <div className="h-[400px] border rounded-b-md">
                    <Editor
                      value={state.previewMarkdown}
                      language="markdown"
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

              {/* 预览提示 */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500">💡</span>
                  <div className="text-sm text-blue-700">
                    <strong>变更摘要预览：</strong>
                    右侧显示原始文档 + 你已接受操作的详细摘要。每当你接受或拒绝操作，摘要会立即更新。
                    {state.libraryOperations.filter(op => op.status === 'accepted').length === 0 && (
                      <span className="block mt-1 text-blue-600">
                        目前显示原始文档，因为你还没有接受任何变更。
                      </span>
                    )}
                    <span className="block mt-2 text-blue-600 font-medium">
                      📋 点击&quot;应用决策&quot;后，库会精确地将接受的操作转换为最终的ProseMirror JSON。
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
