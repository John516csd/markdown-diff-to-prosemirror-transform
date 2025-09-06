"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EXAMPLE_SCENARIOS, type ExampleScenario } from '@/lib/examples';

interface ExampleSelectorProps {
  currentExample: ExampleScenario;
  onExampleChange: (example: ExampleScenario) => void;
  onTextChange: (original: string, modified: string) => void;
}

export function ExampleSelector({ 
  currentExample, 
  onExampleChange, 
  onTextChange 
}: ExampleSelectorProps) {
  const [selectedExample, setSelectedExample] = useState<ExampleScenario>(currentExample);

  const handleExampleSelect = (example: ExampleScenario) => {
    setSelectedExample(example);
    onExampleChange(example);
    onTextChange(example.original, example.modified);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📚 Example Scenarios
          <Badge variant="secondary">{EXAMPLE_SCENARIOS.length} scenarios</Badge>
        </CardTitle>
        <CardDescription>
          Choose from predefined examples to see how markdown-diff-prosemirror handles different types of changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {EXAMPLE_SCENARIOS.map((example, index) => (
            <Button
              key={index}
              variant={selectedExample.name === example.name ? "default" : "outline"}
              onClick={() => handleExampleSelect(example)}
              className="h-auto p-4 flex flex-col items-start gap-2"
            >
              <div className="font-medium text-left">{example.name}</div>
              <div className="text-xs text-muted-foreground text-left leading-relaxed">
                {example.description}
              </div>
            </Button>
          ))}
        </div>
        
        {selectedExample && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="font-medium mb-2">Selected: {selectedExample.name}</div>
            <div className="text-sm text-muted-foreground mb-3">
              {selectedExample.description}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-medium mb-1">Original ({selectedExample.original.split('\n').length} lines)</div>
                <pre className="bg-background p-2 rounded border max-h-32 overflow-auto">
{selectedExample.original}
                </pre>
              </div>
              <div>
                <div className="font-medium mb-1">Modified ({selectedExample.modified.split('\n').length} lines)</div>
                <pre className="bg-background p-2 rounded border max-h-32 overflow-auto">
{selectedExample.modified}
                </pre>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
