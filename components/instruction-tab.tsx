"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Camera, CameraIcon, Plus, X, RotateCcw, ImageIcon, Send } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

// Define types for our component
interface InstructionStep {
  id: string
  text: string
  image?: string // Base64 encoded image
}

interface ResponseItem {
  id: string
  timestamp: string
  text?: string
  image?: string
}

export default function InstructionTab() {
  // Task setup states
  const [taskTitle, setTaskTitle] = useState("")
  const [instructionSteps, setInstructionSteps] = useState<InstructionStep[]>([{ id: "step-1", text: "" }])
  const [isTaskSubmitted, setIsTaskSubmitted] = useState(false)
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)

  // Webcam states
  const [isWebcamActive, setIsWebcamActive] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)

  // Response states
  const [responses, setResponses] = useState<ResponseItem[]>([])

  // Error and success states
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // Reset everything
  const resetEverything = async () => {
    try {
      // Call the reset endpoint
      const response = await fetch("https://api.webpresent.be/reset/", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Reset failed with status ${response.status}`)
      }

      // Reset all state
      setTaskTitle("")
      setInstructionSteps([{ id: "step-1", text: "" }])
      setIsTaskSubmitted(false)
      setResponses([])
      setError(null)
      setSuccess("Task reset successfully")

      // Stop webcam if active
      if (isWebcamActive) {
        stopWebcam()
      }
    } catch (err) {
      console.error("Error resetting task:", err)
      setError("Failed to reset task. Please try again.")
    }
  }

  // Add a new instruction step
  const addInstructionStep = () => {
    setInstructionSteps([...instructionSteps, { id: `step-${instructionSteps.length + 1}`, text: "" }])
  }

  // Remove an instruction step
  const removeInstructionStep = (id: string) => {
    if (instructionSteps.length <= 1) {
      setError("You must have at least one instruction step")
      return
    }

    setInstructionSteps(instructionSteps.filter((step) => step.id !== id))
  }

  // Update an instruction step text
  const updateStepText = (id: string, text: string) => {
    setInstructionSteps(instructionSteps.map((step) => (step.id === id ? { ...step, text } : step)))
  }

  // Handle image upload for a step
  const handleImageUpload = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64Image = e.target?.result as string
      setInstructionSteps(instructionSteps.map((step) => (step.id === id ? { ...step, image: base64Image } : step)))
    }
    reader.readAsDataURL(file)
  }

  // Remove image from a step
  const removeStepImage = (id: string) => {
    setInstructionSteps(instructionSteps.map((step) => (step.id === id ? { ...step, image: undefined } : step)))
  }

  // Submit the complete task instructions
  const submitTaskInstructions = async () => {
    // Validate inputs
    if (!taskTitle.trim()) {
      setError("Please provide a task title")
      return
    }

    if (instructionSteps.some((step) => !step.text.trim())) {
      setError("All instruction steps must have text")
      return
    }

    setIsSubmittingTask(true)
    setError(null)
    setSuccess(null)

    try {
      // Create form data with all instructions and images
      const formData = new FormData()
      formData.append("title", taskTitle)

      // Add each step as a separate field
      for (let i = 0; i < instructionSteps.length; i++) {
        const step = instructionSteps[i]
        formData.append(`step_${i + 1}`, step.text)

        // Add image if present
        if (step.image) {
          // Convert base64 to blob
          const fetchResponse = await fetch(step.image)
          const imageBlob = await fetchResponse.blob()
          formData.append(`step_${i + 1}_image`, imageBlob, `step_${i + 1}_image.jpg`)
        }
      }

      // Send to backend
      const response = await fetch("https://api.webpresent.be/instruction/setup/", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      // Handle response
      const data = await response.json()

      setIsTaskSubmitted(true)
      setSuccess("Task instructions submitted successfully! You can now use the webcam.")

      // Add the initial response if provided
      if (data.message) {
        setResponses([
          {
            id: `response-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            text: data.message,
          },
        ])
      }
    } catch (err) {
      console.error("Error submitting task instructions:", err)
      setError("Failed to submit task instructions. Please try again.")
    } finally {
      setIsSubmittingTask(false)
    }
  }

  // Start webcam
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
        setIsWebcamActive(true)
        setError(null)
      }
    } catch (err) {
      setError("Could not access webcam. Please check permissions.")
      console.error("Error accessing webcam:", err)
    }
  }

  // Stop webcam
  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      const tracks = stream.getTracks()

      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
      setIsWebcamActive(false)
    }
  }

  // Capture and send image
  const captureAndSendImage = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("Webcam is not active")
      return
    }

    setIsCapturing(true)
    setError(null)

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) {
      setError("Could not access canvas context.")
      setIsCapturing(false)
      return
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
          },
          "image/jpeg",
          0.9,
        )
      })

      // Create form data
      const formData = new FormData()
      formData.append("file", blob, "webcam-frame.jpg")

      // Send to backend
      const response = await fetch("https://api.webpresent.be/instruction/instruction/", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      // Handle response
      const data = await response.json()

      // Create a new response entry
      const newResponse: ResponseItem = {
        id: `response-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
      }

      if (data.result) {
        newResponse.text = data.result
      }

      if (data.image_url) {
        newResponse.image = data.image_url
      }

      // Add to responses (at the beginning for reverse chronological order)
      setResponses((prev) => [newResponse, ...prev])
    } catch (err) {
      console.error("Error sending image:", err)
      setError("Failed to send image. Please try again.")
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Reset Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={resetEverything} className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset Task
        </Button>
      </div>

      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert
          variant="default"
          className="bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400"
        >
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Task Setup Section - Only show if task not submitted */}
      {!isTaskSubmitted && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Task Setup</h2>

          {/* Task Title */}
          <div className="mb-6">
            <label htmlFor="task-title" className="block text-sm font-medium mb-2">
              Task Title
            </label>
            <Input
              id="task-title"
              placeholder="Enter a title for this task"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Instruction Steps */}
          <div className="space-y-6 mb-6">
            <h3 className="text-lg font-semibold">Instructions</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add step-by-step instructions for this task. You can add images to help explain each step.
            </p>

            {instructionSteps.map((step, index) => (
              <div key={step.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Step {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInstructionStep(step.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove step</span>
                  </Button>
                </div>

                <Textarea
                  placeholder={`Describe step ${index + 1}`}
                  value={step.text}
                  onChange={(e) => updateStepText(step.id, e.target.value)}
                  className="mb-2"
                />

                {step.image ? (
                  <div className="relative mt-2">
                    <img
                      src={step.image || "/placeholder.svg"}
                      alt={`Image for step ${index + 1}`}
                      className="max-h-40 rounded-md object-contain"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeStepImage(step.id)}
                      className="absolute top-2 right-2 h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove image</span>
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      id={`image-${step.id}`}
                      className="hidden"
                      onChange={(e) => handleImageUpload(step.id, e)}
                      ref={(el) => (fileInputRefs.current[step.id] = el)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRefs.current[step.id]?.click()}
                      className="flex items-center gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Add Image
                    </Button>
                  </div>
                )}
              </div>
            ))}

            <Button variant="outline" onClick={addInstructionStep} className="flex items-center gap-2 w-full">
              <Plus className="h-4 w-4" />
              Add Another Step
            </Button>
          </div>

          {/* Submit Button */}
          <Button
            onClick={submitTaskInstructions}
            disabled={isSubmittingTask}
            className="flex items-center gap-2 w-full"
          >
            <Send className="h-4 w-4" />
            {isSubmittingTask ? "Submitting..." : "Submit Task Instructions"}
          </Button>
        </Card>
      )}

      {/* Webcam Section - Only show if task submitted */}
      {isTaskSubmitted && (
        <div className="space-y-6">
          {/* Webcam Controls */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Task Execution</h2>
              {!isWebcamActive ? (
                <Button onClick={startWebcam} className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Start Webcam
                </Button>
              ) : (
                <div className="space-x-2">
                  <Button onClick={captureAndSendImage} disabled={isCapturing} className="flex items-center gap-2">
                    <CameraIcon className="h-4 w-4" />
                    {isCapturing ? "Processing..." : "Capture & Send"}
                  </Button>
                  <Button onClick={stopWebcam} variant="outline" className="flex items-center gap-2">
                    Stop Webcam
                  </Button>
                </div>
              )}
            </div>

            {/* Webcam Feed */}
            <div className="relative bg-muted rounded-md aspect-video flex items-center justify-center overflow-hidden">
              {!isWebcamActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-muted-foreground">Start webcam to see feed</p>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain ${!isWebcamActive ? "hidden" : ""}`}
              />
            </div>
          </Card>

          {/* Responses Section */}
          {responses.length > 0 && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Responses</h2>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {responses.map((response) => (
                    <div key={response.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">Response</h3>
                        <span className="text-sm text-muted-foreground">{response.timestamp}</span>
                      </div>

                      {response.text && <p className="text-sm mb-4 whitespace-pre-wrap">{response.text}</p>}

                      {response.image && (
                        <div className="mt-2">
                          <img
                            src={response.image || "/placeholder.svg"}
                            alt="Response image"
                            className="max-w-full rounded-md object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>
      )}

      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

