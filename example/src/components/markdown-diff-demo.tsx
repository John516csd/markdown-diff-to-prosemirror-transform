'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  MarkdownDiffProseMirrorTransformer,
  MarkdownParser,
} from 'markdown-diff-prosemirror';
import type {
  TransformResult,
  ProseMirrorDocument,
} from 'markdown-diff-prosemirror';
import { ExampleSelector } from './example-selector';
import { DEFAULT_EXAMPLE, type ExampleScenario } from '@/lib/examples';

export function MarkdownDiffDemo() {
  const [originalText, setOriginalText] = useState(DEFAULT_EXAMPLE.original);
  const [modifiedText, setModifiedText] = useState(DEFAULT_EXAMPLE.modified);
  const [currentExample, setCurrentExample] =
    useState<ExampleScenario>(DEFAULT_EXAMPLE);
  const [transformResult, setTransformResult] =
    useState<TransformResult | null>(null);
  const [originalDoc, setOriginalDoc] = useState<ProseMirrorDocument | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Process the diff transformation
  const processDiff = useCallback(async () => {
    if (!originalText.trim() || !modifiedText.trim()) {
      setError('Both original and modified text are required');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create a simple ProseMirror document structure from original markdown
      const originalBlocks = MarkdownParser.parseToBlocks(originalText);

      // Create a basic ProseMirror document structure
      const proseMirrorDoc: ProseMirrorDocument = {
        type: 'doc',
        content: originalBlocks.map((block) => {
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
          } else if (block.type === 'paragraph') {
            return {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: block.content.join('\n'),
                },
              ],
            };
          } else {
            return {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: block.content.join('\n'),
                },
              ],
            };
          }
        }),
      };

      setOriginalDoc(proseMirrorDoc);

      // Transform using the library
      const result = await MarkdownDiffProseMirrorTransformer.transform(
        originalText,
        modifiedText,
        proseMirrorDoc,
        {
          preserveFormatting: true,
          handleStructuralChanges: true,
          granularity: 'block',
        }
      );

      setTransformResult(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred'
      );
      console.error('Transform error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [originalText, modifiedText]);

  // Auto-process when text changes
  useEffect(() => {
    processDiff();
  }, [processDiff]);

  const resetToExamples = () => {
    setOriginalText(DEFAULT_EXAMPLE.original);
    setModifiedText(DEFAULT_EXAMPLE.modified);
    setCurrentExample(DEFAULT_EXAMPLE);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Markdown Diff ProseMirror Demo</h1>
        <p className="text-lg text-muted-foreground">
          Explore how markdown differences are converted to ProseMirror
          transforms
        </p>
      </div>

      <ExampleSelector
        currentExample={currentExample}
        onExampleChange={setCurrentExample}
        onTextChange={(original: string, modified: string) => {
          setOriginalText(original);
          setModifiedText(modified);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            Input Texts
            <Badge variant="outline" className="ml-2">
              {currentExample.name}
            </Badge>
          </CardTitle>
          <CardDescription>
            Edit the original and modified markdown texts to see how the library
            processes differences.
            <br />
            <span className="text-sm">{currentExample.description}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Original Markdown</label>
              <Textarea
                placeholder="Enter original markdown text..."
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Modified Markdown</label>
              <Textarea
                placeholder="Enter modified markdown text..."
                value={modifiedText}
                onChange={(e) => setModifiedText(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={processDiff} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <span className="animate-spin mr-2">⚙️</span>
                  Processing...
                </>
              ) : (
                <>🔄 Process Diff</>
              )}
            </Button>
            <Button variant="outline" onClick={resetToExamples}>
              🔧 Reset to Examples
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-md">
              <p className="text-sm text-destructive flex items-center gap-2">
                ❌ <strong>Error:</strong> {error}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {transformResult && (
        <Tabs defaultValue="result" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="result">📊 Transform Result</TabsTrigger>
            <TabsTrigger value="operations">⚙️ Operations</TabsTrigger>
            <TabsTrigger value="statistics">📈 Statistics</TabsTrigger>
            <TabsTrigger value="documents">📄 Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="result" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Transform Result
                  <Badge
                    variant={
                      transformResult.success ? 'default' : 'destructive'
                    }
                  >
                    {transformResult.success ? 'Success' : 'Failed'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transformResult.errors.length > 0 && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-md">
                    <p className="font-medium text-sm mb-2">Errors:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {transformResult.errors.map((error, index) => (
                        <li key={index} className="text-destructive">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        ⚙️ Operations Count
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-blue-600">
                        {transformResult.operations.length}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        📝 Text Changes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-600">
                        {transformResult.statistics.textChanges}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        🏗️ Nodes Modified
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-orange-600">
                        {transformResult.statistics.nodesModified}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        🔄 Structural Changes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-purple-600">
                        {transformResult.statistics.structuralChanges}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  Diff Operations ({transformResult.operations.length})
                </CardTitle>
                <CardDescription>
                  List of all operations required to transform the original
                  document
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transformResult.operations.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <div className="text-center">
                      <div className="text-4xl mb-2">✅</div>
                      <p>No operations required - documents are identical</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {transformResult.operations.map((op, index) => {
                      const getOperationIcon = (type: string) => {
                        switch (type) {
                          case 'insert':
                          case 'insert_node':
                            return '➕';
                          case 'delete':
                          case 'delete_node':
                            return '➖';
                          case 'replace':
                          case 'modify_node':
                            return '🔄';
                          default:
                            return '⚙️';
                        }
                      };

                      const getOperationColor = (type: string) => {
                        switch (type) {
                          case 'insert':
                          case 'insert_node':
                            return 'bg-green-50 border-green-200';
                          case 'delete':
                          case 'delete_node':
                            return 'bg-red-50 border-red-200';
                          case 'replace':
                          case 'modify_node':
                            return 'bg-blue-50 border-blue-200';
                          default:
                            return 'bg-gray-50 border-gray-200';
                        }
                      };

                      return (
                        <div
                          key={index}
                          className={`border rounded-lg p-4 ${getOperationColor(op.type)}`}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">
                              {getOperationIcon(op.type)}
                            </span>
                            <Badge variant="outline" className="font-mono">
                              {op.type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              📍 Position: {op.markdownPosition}
                            </span>
                            {op.length && (
                              <span className="text-sm text-muted-foreground">
                                📏 Length: {op.length}
                              </span>
                            )}
                          </div>
                          {op.content && (
                            <div className="text-sm mb-2">
                              <span className="font-medium text-green-700">
                                ➕ New Content:{' '}
                              </span>
                              <code className="bg-white/80 px-2 py-1 rounded border text-xs">
                                {op.content.length > 100
                                  ? `${op.content.substring(0, 100)}...`
                                  : op.content}
                              </code>
                            </div>
                          )}
                          {op.originalContent && (
                            <div className="text-sm">
                              <span className="font-medium text-red-700">
                                ➖ Original Content:{' '}
                              </span>
                              <code className="bg-white/80 px-2 py-1 rounded border text-xs">
                                {op.originalContent.length > 100
                                  ? `${op.originalContent.substring(0, 100)}...`
                                  : op.originalContent}
                              </code>
                            </div>
                          )}
                          {op.nodeType && (
                            <div className="text-xs text-muted-foreground mt-2">
                              🏷️ Node Type: <code>{op.nodeType}</code>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Processing Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Change Metrics</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Nodes Modified:</span>
                          <span className="font-mono">
                            {transformResult.statistics.nodesModified}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Text Changes:</span>
                          <span className="font-mono">
                            {transformResult.statistics.textChanges}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Structural Changes:</span>
                          <span className="font-mono">
                            {transformResult.statistics.structuralChanges}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Document Analysis
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Original Length:</span>
                          <span className="font-mono">
                            {originalText.length} chars
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Modified Length:</span>
                          <span className="font-mono">
                            {modifiedText.length} chars
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Size Difference:</span>
                          <span className="font-mono">
                            {modifiedText.length - originalText.length > 0
                              ? '+'
                              : ''}
                            {modifiedText.length - originalText.length} chars
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Original ProseMirror Document
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[300px]">
                    {JSON.stringify(originalDoc, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Transformed ProseMirror Document
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[300px]">
                    {JSON.stringify(transformResult.newDocument, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
