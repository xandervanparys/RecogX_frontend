"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera, Pause, Play, Clock } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// Define types for detected objects
interface DetectedObject {
  id: number
  box: number[] // [x1, y1, x2, y2]
  confidence: number
  class?: string // Optional class label
}

// Define type for performance metrics
interface PerformanceMetrics {
  summary: string
  preprocess: string
  inference: string
  postprocess: string
  imageShape: string
  timestamp: string
}

export default function ObjectDetectionTab() {
  // Change the backendUrl state initialization to use the hardcoded value
  const [backendUrl, setBackendUrl] = useState("https://api.web-present.be/yolo/detect/")
  const [returnedImage, setReturnedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([])
  const [captureInterval, setCaptureInterval] = useState<number>(2000)
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)
  const [lastProcessedTime, setLastProcessedTime] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState<boolean>(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Start webcam stream
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsStreaming(true)
        setError(null)
        startFrameCapture()
      }
    } catch (err) {
      setError("Could not access webcam. Please check permissions.")
      console.error("Error accessing webcam:", err)
    }
  }

  // Stop webcam stream
  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      const tracks = stream.getTracks()

      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
      setIsStreaming(false)

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }

  // Parse performance metrics from backend response
  const parsePerformanceMetrics = (data: any): PerformanceMetrics | null => {
    try {
      // Check if the backend included performance metrics
      if (!data.performance_metrics && !data.summary) {
        return null
      }

      // Use the dedicated performance_metrics field if available, otherwise try to parse from summary
      const metrics = data.performance_metrics || {}
      const summary = metrics.summary || data.summary || ""

      // Extract timing information using regex if not directly provided
      let preprocess = metrics.preprocess || "0ms"
      let inference = metrics.inference || "0ms"
      let postprocess = metrics.postprocess || "0ms"
      let imageShape = metrics.image_shape || ""

      // Try to extract from summary if not provided directly
      if (summary && (!preprocess || !inference || !postprocess || !imageShape)) {
        const speedMatch = summary.match(/(\d+\.?\d*)ms preprocess, (\d+\.?\d*)ms inference, (\d+\.?\d*)ms postprocess/)
        const shapeMatch = summary.match(/shape $$([^)]+)$$/)

        if (speedMatch) {
          preprocess = preprocess || `${speedMatch[1]}ms`
          inference = inference || `${speedMatch[2]}ms`
          postprocess = postprocess || `${speedMatch[3]}ms`
        }

        if (shapeMatch) {
          imageShape = imageShape || shapeMatch[1]
        }
      }

      // Get current timestamp
      const now = new Date()
      const timestamp = now.toLocaleTimeString()

      return {
        summary,
        preprocess,
        inference,
        postprocess,
        imageShape,
        timestamp,
      }
    } catch (error) {
      console.error("Error parsing performance metrics:", error)
      return null
    }
  }

  // Capture frame and send to backend
  const captureAndSendFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !backendUrl) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvasRef.current.getContext("2d")

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to blob
    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
          },
          "image/jpeg",
          0.8,
        )
      })

      // Create form data and append the image
      const formData = new FormData()
      formData.append("file", blob, "webcam-frame.jpg")

      // Record the current time
      setLastProcessedTime(new Date().toLocaleTimeString())

      // Send to backend
      const response = await fetch(backendUrl, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      // Parse the JSON response
      const data = await response.json()

      // Extract bounding boxes and confidence scores
      const boundingBoxes = data.bounding_boxes || []
      const confidences = data.confidences || boundingBoxes.map(() => 0.0) // Default if not provided
      const classes = data.classes || boundingBoxes.map(() => "Unknown") // Default if not provided

      // Parse performance metrics
      const metrics = parsePerformanceMetrics(data)
      if (metrics) {
        setPerformanceMetrics(metrics)
      }

      // Create detected objects array
      const objects: DetectedObject[] = boundingBoxes.map((box: number[], index: number) => ({
        id: index + 1,
        box: box,
        confidence: confidences[index] || 0,
        class: classes[index] || "Unknown",
      }))

      setDetectedObjects(objects)

      // Create a new canvas for the annotated image
      const annotatedCanvas = document.createElement("canvas")
      annotatedCanvas.width = canvas.width
      annotatedCanvas.height = canvas.height
      const annotatedContext = annotatedCanvas.getContext("2d")

      if (annotatedContext) {
        // Draw the original image
        annotatedContext.drawImage(canvas, 0, 0)

        // Draw bounding boxes
        annotatedContext.strokeStyle = "#00FF00" // Green color for boxes
        annotatedContext.lineWidth = 3

        objects.forEach((obj) => {
          const [x1, y1, x2, y2] = obj.box
          const width = x2 - x1
          const height = y2 - y1

          annotatedContext.strokeRect(x1, y1, width, height)

          // Add labels with confidence if available
          annotatedContext.fillStyle = "#00FF00"
          annotatedContext.font = "16px Arial"

          const label =
            obj.class !== "Unknown"
              ? `${obj.class} ${(obj.confidence * 100).toFixed(0)}%`
              : `Object ${obj.id} ${(obj.confidence * 100).toFixed(0)}%`

          annotatedContext.fillText(label, x1, y1 > 20 ? y1 - 5 : y1 + 20)
        })

        // Convert the annotated canvas to an image URL
        const imageUrl = annotatedCanvas.toDataURL("image/jpeg")
        setReturnedImage(imageUrl)
      }

      setError(null)
    } catch (err) {
      console.error("Error sending frame to backend:", err)
      setError("Failed to send or receive frame from backend.")
    }
  }

  // Start interval to capture frames
  const startFrameCapture = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(() => {
      captureAndSendFrame()
    }, captureInterval)
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      stopWebcam()
    }
  }, [])

  // Format confidence as percentage
  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(1)}%`
  }

  return (
    <div>
      {/* Remove the backend URL input section and replace it with a simple message */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Using API: https://api.webpresent.be/yolo/detect/</p>
          {!isStreaming ? (
            <Button onClick={startWebcam} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Start Webcam
            </Button>
          ) : (
            <Button onClick={stopWebcam} variant="destructive" className="flex items-center gap-2">
              <Pause className="h-4 w-4" />
              Stop Webcam
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <Label htmlFor="capture-interval">Capture Interval (ms)</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="capture-interval"
            type="number"
            min="500"
            max="10000"
            step="100"
            value={captureInterval}
            onChange={(e) => setCaptureInterval(Number(e.target.value))}
            disabled={isStreaming}
            className="w-full"
          />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          How often to capture and send frames (in milliseconds). Min: 500ms, Max: 10000ms
        </p>
      </div>

      {error && <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-6">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Live Webcam Feed</h2>
          </div>
          <div className="relative bg-muted rounded-md aspect-video flex items-center justify-center overflow-hidden">
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-muted-foreground">Webcam feed will appear here</p>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-contain ${!isStreaming ? "hidden" : ""}`}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Processed Frame</h2>
          </div>
          <div className="relative bg-muted rounded-md aspect-video flex items-center justify-center overflow-hidden">
            {!returnedImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-muted-foreground">Processed frames will appear here</p>
              </div>
            )}
            {returnedImage && (
              <img
                src={returnedImage || "/placeholder.svg"}
                alt="Processed frame from backend"
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </Card>
      </div>

      {/* Performance Metrics */}
      {performanceMetrics && (
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Performance Metrics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Processing Times</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Preprocess:</span>
                  <Badge variant="outline">{performanceMetrics.preprocess}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Inference:</span>
                  <Badge variant="outline">{performanceMetrics.inference}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Postprocess:</span>
                  <Badge variant="outline">{performanceMetrics.postprocess}</Badge>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Timing Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Image Shape:</span>
                  <Badge variant="outline">{performanceMetrics.imageShape}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Last Processed:</span>
                  <Badge variant="outline">{lastProcessedTime || "N/A"}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Response Time:</span>
                  <Badge variant="outline">{performanceMetrics.timestamp}</Badge>
                </div>
              </div>
            </div>
          </div>

          {performanceMetrics.summary && (
            <>
              <Separator className="my-3" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Summary:</p>
                <p className="font-mono text-xs">{performanceMetrics.summary}</p>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Detected Objects List */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Detected Objects</h2>

        {detectedObjects.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No objects detected yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="w-[180px]">Confidence</TableHead>
                <TableHead className="hidden md:table-cell">Bounding Box</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detectedObjects.map((object) => (
                <TableRow key={object.id}>
                  <TableCell className="font-medium">{object.id}</TableCell>
                  <TableCell>{object.class || "Unknown"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={object.confidence * 100} className="h-2" />
                      <span className="text-sm">{formatConfidence(object.confidence)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <code className="text-xs">[{object.box.map((n) => Math.round(n)).join(", ")}]</code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

