"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Editor } from '@monaco-editor/react';

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

interface DiffViewerProps {
  operations: DiffOperation[];
  onDecision: (operationId: string, decision: 'accepted' | 'rejected') => void;
}

export function DiffViewer({ operations, onDecision }: DiffViewerProps) {
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'insert': return '➕';
      case 'delete': return '➖';
      case 'modify': return '🔄';
      default: return '⚙️';
    }
  };

  const getOperationColor = (type: string, status: string) => {
    if (status === 'accepted') return 'bg-green-50 border-green-200';
    if (status === 'rejected') return 'bg-red-50 border-red-200';
    
    switch (type) {
      case 'insert': return 'bg-blue-50 border-blue-200';
      case 'delete': return 'bg-orange-50 border-orange-200';
      case 'modify': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 border-green-300">✅ 已接受</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-300">❌ 已拒绝</Badge>;
      default:
        return <Badge variant="outline">⏳ 待决策</Badge>;
    }
  };

  const handleAccept = (operationId: string) => {
    onDecision(operationId, 'accepted');
  };

  const handleReject = (operationId: string) => {
    onDecision(operationId, 'rejected');
  };

  const handleAcceptAll = () => {
    operations.filter(op => op.status === 'pending').forEach(op => {
      onDecision(op.id, 'accepted');
    });
  };

  const handleRejectAll = () => {
    operations.filter(op => op.status === 'pending').forEach(op => {
      onDecision(op.id, 'rejected');
    });
  };

  const renderDiffContent = (operation: DiffOperation) => {
    const createDiffString = (oldText: string = '', newText: string = '') => {
      const lines: string[] = [];
      
      if (oldText) {
        oldText.split('\n').forEach(line => {
          lines.push(`- ${line}`);
        });
      }
      
      if (newText) {
        newText.split('\n').forEach(line => {
          lines.push(`+ ${line}`);
        });
      }
      
      return lines.join('\n');
    };

    let content = '';
    switch (operation.type) {
      case 'insert':
        content = createDiffString('', operation.newText);
        break;
      case 'delete':
        content = createDiffString(operation.oldText, '');
        break;
      case 'modify':
        content = createDiffString(operation.oldText, operation.newText);
        break;
    }

    return (
      <div className="h-48 border rounded">
        <Editor
          defaultLanguage="diff"
          value={content}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            wordWrap: 'on',
            lineNumbers: 'off',
            folding: false,
            renderLineHighlight: 'none'
          }}
          theme="vs-light"
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                👁️ Diff 审查 - {operations.length} 个变更
              </CardTitle>
              <CardDescription>
                审查AI提出的每个变更，决定接受或拒绝
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleAcceptAll}>
                ✅ 全部接受
              </Button>
              <Button size="sm" variant="outline" onClick={handleRejectAll}>
                ❌ 全部拒绝
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Operations List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {operations.map((operation, index) => (
                <div
                  key={operation.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    getOperationColor(operation.type, operation.status)
                  } ${selectedOperation === operation.id ? 'ring-2 ring-blue-400' : ''}`}
                  onClick={() => setSelectedOperation(
                    selectedOperation === operation.id ? null : operation.id
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getOperationIcon(operation.type)}</span>
                      <div>
                        <div className="font-medium text-sm">
                          变更 #{index + 1} - {operation.type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          位置: {operation.position}
                          {operation.length && ` | 长度: ${operation.length}`}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(operation.status)}
                  </div>

                  <div className="text-sm mb-3">
                    <p className="font-medium mb-1">描述:</p>
                    <p className="text-muted-foreground">{operation.description}</p>
                  </div>

                  {/* Quick preview of changes */}
                  <div className="text-xs space-y-1 mb-3">
                    {operation.oldText && (
                      <div className="bg-red-50 px-2 py-1 rounded border-l-2 border-red-300">
                        <span className="font-medium text-red-700">- </span>
                        <span className="text-red-600">
                          {operation.oldText.length > 50 
                            ? `${operation.oldText.substring(0, 50)}...` 
                            : operation.oldText}
                        </span>
                      </div>
                    )}
                    {operation.newText && (
                      <div className="bg-green-50 px-2 py-1 rounded border-l-2 border-green-300">
                        <span className="font-medium text-green-700">+ </span>
                        <span className="text-green-600">
                          {operation.newText.length > 50 
                            ? `${operation.newText.substring(0, 50)}...` 
                            : operation.newText}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {operation.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccept(operation.id);
                        }}
                        className="flex-1"
                      >
                        ✅ 接受
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(operation.id);
                        }}
                        className="flex-1"
                      >
                        ❌ 拒绝
                      </Button>
                    </div>
                  )}

                  {operation.status === 'accepted' && (
                    <div className="text-center">
                      <Badge className="bg-green-100 text-green-800">
                        ✅ 此变更将被应用
                      </Badge>
                    </div>
                  )}

                  {operation.status === 'rejected' && (
                    <div className="text-center">
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        ❌ 此变更已被拒绝
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Detailed view of selected operation */}
            <div className="sticky top-0">
              {selectedOperation ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      📝 详细变更内容
                    </CardTitle>
                    <CardDescription>
                      {operations.find(op => op.id === selectedOperation)?.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderDiffContent(operations.find(op => op.id === selectedOperation)!)}
                    
                    <div className="mt-4 space-y-2">
                      {operations.find(op => op.id === selectedOperation)?.oldText && (
                        <div>
                          <label className="text-sm font-medium text-red-700">原始内容:</label>
                          <div className="bg-red-50 p-2 rounded border text-xs font-mono">
                            {operations.find(op => op.id === selectedOperation)?.oldText}
                          </div>
                        </div>
                      )}
                      
                      {operations.find(op => op.id === selectedOperation)?.newText && (
                        <div>
                          <label className="text-sm font-medium text-green-700">新内容:</label>
                          <div className="bg-green-50 p-2 rounded border text-xs font-mono">
                            {operations.find(op => op.id === selectedOperation)?.newText}
                          </div>
                        </div>
                      )}
                    </div>

                    {operations.find(op => op.id === selectedOperation)?.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <Button 
                          onClick={() => handleAccept(selectedOperation)}
                          className="flex-1"
                        >
                          ✅ 接受此变更
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleReject(selectedOperation)}
                          className="flex-1"
                        >
                          ❌ 拒绝此变更
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground py-8">
                      <div className="text-4xl mb-2">👆</div>
                      <p>点击左侧的变更项目查看详细内容</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
