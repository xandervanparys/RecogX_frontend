"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ObjectDetectionTab from "@/components/object-detection-tab"
import InstructionTab from "@/components/instruction-tab"

export default function WebcamFeedPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">RecogX</h1>

      <Tabs defaultValue="instruction" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="object-detection">Object Detection</TabsTrigger>
          <TabsTrigger value="instruction">Instruction-based Processing</TabsTrigger>
        </TabsList>

        <TabsContent value="object-detection">
          <ObjectDetectionTab />
        </TabsContent>

        <TabsContent value="instruction">
          <InstructionTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

