'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Editor, DiffEditor } from '@monaco-editor/react';
import * as Diff from 'diff';

interface DiffChange extends Diff.Change {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  lineNumber: number;
  endLineNumber: number;
}

interface VSCodeDiffViewerProps {
  originalText: string;
  modifiedText: string;
  onApplyChanges: (acceptedChanges: DiffChange[]) => void;
  isProcessing?: boolean;
}

export function VSCodeDiffViewer({ 
  originalText, 
  modifiedText, 
  onApplyChanges,
  isProcessing = false 
}: VSCodeDiffViewerProps) {
  const [diffChanges, setDiffChanges] = useState<DiffChange[]>([]);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

  // 计算diff变更
  useEffect(() => {
    if (!originalText || !modifiedText) return;

    const changes = Diff.diffLines(originalText, modifiedText);
    let lineNumber = 0;
    const processedChanges: DiffChange[] = [];

    changes.forEach((change, index) => {
      if (change.added || change.removed) {
        const count = change.count || 0;
        processedChanges.push({
          ...change,
          id: `diff-${index}`,
          status: 'pending',
          lineNumber: lineNumber,
          endLineNumber: lineNumber + count - 1,
        });
      }
      
      if (!change.removed) {
        lineNumber += change.count || 0;
      }
    });

    setDiffChanges(processedChanges);
  }, [originalText, modifiedText]);

  // 处理单个变更决策
  const handleChangeDecision = useCallback((changeId: string, status: 'accepted' | 'rejected') => {
    setDiffChanges(prev => prev.map(change => 
      change.id === changeId ? { ...change, status } : change
    ));
  }, []);

  // 批量接受所有变更
  const acceptAllChanges = useCallback(() => {
    setDiffChanges(prev => prev.map(change => ({ ...change, status: 'accepted' })));
  }, []);

  // 批量拒绝所有变更
  const rejectAllChanges = useCallback(() => {
    setDiffChanges(prev => prev.map(change => ({ ...change, status: 'rejected' })));
  }, []);

  // 应用变更
  const applyChanges = useCallback(() => {
    const acceptedChanges = diffChanges.filter(change => change.status === 'accepted');
    onApplyChanges(acceptedChanges);
  }, [diffChanges, onApplyChanges]);

  // 获取统计信息
  const stats = {
    total: diffChanges.length,
    pending: diffChanges.filter(c => c.status === 'pending').length,
    accepted: diffChanges.filter(c => c.status === 'accepted').length,
    rejected: diffChanges.filter(c => c.status === 'rejected').length,
  };

  return (
    <div className="space-y-4">
      {/* 控制栏 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              📊 文档差异对比
              <Badge variant="outline" className="ml-2">
                {stats.total} 个变更
              </Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'split' ? 'unified' : 'split')}
              >
                {viewMode === 'split' ? '📱 统一视图' : '📋 分栏视图'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-between">
            {/* 统计信息 */}
            <div className="flex gap-4">
              <Badge variant="outline">
                ⏳ 待决策: {stats.pending}
              </Badge>
              <Badge variant="default">
                ✅ 已接受: {stats.accepted}
              </Badge>
              <Badge variant="secondary">
                ❌ 已拒绝: {stats.rejected}
              </Badge>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={acceptAllChanges}
                disabled={stats.pending === 0}
              >
                ✅ 全部接受
              </Button>
              <Button
                variant="outline" 
                size="sm"
                onClick={rejectAllChanges}
                disabled={stats.pending === 0}
              >
                ❌ 全部拒绝
              </Button>
              <Button
                onClick={applyChanges}
                disabled={stats.accepted === 0 || isProcessing}
                size="sm"
              >
                {isProcessing ? '应用中...' : `🚀 应用 ${stats.accepted} 个变更`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diff编辑器 */}
      <Card>
        <CardContent className="p-0">
          <div className="h-[600px] border rounded-md overflow-hidden">
            {viewMode === 'split' ? (
              <DiffEditor
                original={originalText}
                modified={modifiedText}
                language="markdown"
                theme="vs-dark"
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  enableSplitViewResizing: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  wordWrap: 'on',
                  diffWordWrap: 'on',
                  scrollbar: {
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                  },
                }}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
                <div className="border-r">
                  <div className="bg-red-50 border-b px-4 py-2 text-sm font-medium text-red-800">
                    📄 原始文档
                  </div>
                  <Editor
                    value={originalText}
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
                <div>
                  <div className="bg-green-50 border-b px-4 py-2 text-sm font-medium text-green-800">
                    ✨ AI增强文档
                  </div>
                  <Editor
                    value={modifiedText}
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* 变更详情列表 */}
      {diffChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🔍 变更详情</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {diffChanges.map((change) => (
                <div
                  key={change.id}
                  className={`border rounded-lg p-4 ${
                    change.status === 'accepted' ? 'border-green-200 bg-green-50' :
                    change.status === 'rejected' ? 'border-red-200 bg-red-50' :
                    'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={change.added ? 'default' : 'destructive'}>
                        {change.added ? '+ 添加' : '- 删除'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        第 {change.lineNumber + 1} 行
                      </span>
                      {change.status !== 'pending' && (
                        <Badge variant={change.status === 'accepted' ? 'default' : 'secondary'}>
                          {change.status === 'accepted' ? '✅ 已接受' : '❌ 已拒绝'}
                        </Badge>
                      )}
                    </div>
                    
                    {change.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChangeDecision(change.id, 'accepted')}
                        >
                          ✅ 接受
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChangeDecision(change.id, 'rejected')}
                        >
                          ❌ 拒绝
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="font-mono text-sm bg-gray-100 p-3 rounded border-l-4 border-l-blue-500 max-h-32 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{change.value}</pre>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
