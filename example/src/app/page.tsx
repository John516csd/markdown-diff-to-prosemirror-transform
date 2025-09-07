import { ProseMirrorWorkflow } from "@/components/prosemirror-workflow";
import { ProseMirrorWorkflowNew } from "@/components/prosemirror-workflow-new";
import { SimpleAIWorkflow } from "@/components/simple-ai-workflow";
import { MarkdownDiffDemo } from "@/components/markdown-diff-demo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6">
        <Tabs defaultValue="simple" className="w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">Markdown Diff ProseMirror</h1>
            <p className="text-muted-foreground mb-4">
              Powerful tools for markdown diff processing and ProseMirror transformations
            </p>
            <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-4">
              <TabsTrigger value="simple">✏️ 手动编辑工作流</TabsTrigger>
              <TabsTrigger value="ai-workflow">🤖 复杂 AI 工作流</TabsTrigger>
              <TabsTrigger value="workflow">🔄 模拟工作流程</TabsTrigger>
              <TabsTrigger value="demo">📊 基础演示</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="simple" className="space-y-6">
            <SimpleAIWorkflow />
          </TabsContent>

          <TabsContent value="ai-workflow" className="space-y-6">
            <ProseMirrorWorkflowNew />
          </TabsContent>

          <TabsContent value="workflow" className="space-y-6">
            <ProseMirrorWorkflow />
          </TabsContent>

          <TabsContent value="demo" className="space-y-6">
            <MarkdownDiffDemo />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
