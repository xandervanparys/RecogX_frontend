"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Plus,
  X,
  Send,
  ChevronDown,
  ChevronUp,
  Save,
  Trash2,
  Camera,
  CameraIcon,
  RotateCcw
} from "lucide-react"

interface Task {
  id: string
  title: string
  steps: string[]
}

interface InstructionStep {
  id: string
  text: string
  image?: string
}

interface ResponseItem {
  id: string
  timestamp: string
  text?: string
  image?: string
}

export default function InstructionTab() {
  const [taskTitle, setTaskTitle] = useState("")
  const [instructionSteps, setInstructionSteps] = useState<InstructionStep[]>([{ id: "step-1", text: "" }])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)
  const [isSavingTask, setIsSavingTask] = useState(false)
  const [isTasksOpen, setIsTasksOpen] = useState(false)
  const [isTaskSubmitted, setIsTaskSubmitted] = useState(false)
  const baseURL = "https://api.web-present.be"

  // Webcam states
  const [isWebcamActive, setIsWebcamActive] = useState(false)
  const [useFrontCamera, setUseFrontCamera] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false)

  // Response states (for tracking feedback from webcam submissions)
  const [responses, setResponses] = useState<ResponseItem[]>([])

  // Error and success states
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Refs for webcam and canvas
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Fetch all tasks from backend
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch(`${baseURL}/instruction/tasks/`)
        if (!response.ok) throw new Error("Failed to fetch tasks")
        const data: Task[] = await response.json()
        setTasks(data)
      } catch (err) {
        console.error("Error fetching tasks:", err)
      }
    }
    fetchTasks()
  }, [])

  // Load a saved task into the creation fields
  const loadTask = (task: Task) => {
    setTaskTitle(task.title)
    setInstructionSteps(task.steps.map((step, index) => ({ id: `step-${index + 1}`, text: step })))
  }

  // Save a task (user-created) to backend
  const saveTask = async () => {
    if (!taskTitle.trim()) {
      alert("Please provide a task title")
      return
    }
    if (instructionSteps.some((step) => !step.text.trim())) {
      alert("All instruction steps must have text")
      return
    }

    setIsSavingTask(true)
    try {
      const formData = new FormData()
      formData.append("task_title", taskTitle)
      instructionSteps.forEach((step) => formData.append("instructions", step.text))

      const response = await fetch(`${baseURL}/instruction/tasks/`, {
        method: "POST",
        body: formData,
      })
      if (!response.ok) throw new Error("Failed to save task")
      alert("Task saved successfully!")

      // Refresh tasks list
      const updatedTasks = await fetch(`${baseURL}/instruction/tasks/`).then((res) => res.json())
      setTasks(updatedTasks)
    } catch (err) {
      console.error("Error saving task:", err)
      alert("Failed to save task. Please try again.")
    } finally {
      setIsSavingTask(false)
    }
  }

  // Delete a task
  const deleteTask = async (taskId: string) => {
    const confirmDelete = confirm("Are you sure you want to delete this task?")
    if (!confirmDelete) return

    try {
      const response = await fetch(`${baseURL}/instruction/tasks/${taskId}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete task")
      // Remove from frontend
      setTasks(tasks.filter((task) => task.id !== taskId))
    } catch (err) {
      console.error("Error deleting task:", err)
      alert("Failed to delete task. Please try again.")
    }
  }

  // Manually add a new instruction step
  const addInstructionStep = () => {
    setInstructionSteps([...instructionSteps, { id: `step-${instructionSteps.length + 1}`, text: "" }])
  }

  // Remove a step
  const removeInstructionStep = (id: string) => {
    if (instructionSteps.length <= 1) return
    setInstructionSteps(instructionSteps.filter((step) => step.id !== id))
  }

  // Update step text
  const updateStepText = (id: string, text: string) => {
    setInstructionSteps(instructionSteps.map((step) => (step.id === id ? { ...step, text } : step)))
  }

  // Submit task instructions (for tracking)
  const submitTaskInstructions = async () => {
    if (!taskTitle.trim()) {
      alert("Please provide a task title")
      return
    }
    if (instructionSteps.some((step) => !step.text.trim())) {
      alert("All instruction steps must have text")
      return
    }

    setIsSubmittingTask(true)
    try {
      const formData = new FormData()
      formData.append("user_id", "12345") // Replace with actual user ID
      formData.append("task_title", taskTitle)
      instructionSteps.forEach((step) => formData.append("instructions", step.text))

      const response = await fetch(`${baseURL}/instruction/setup/`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error(`Server responded with ${response.status}`)

      alert("Task instructions submitted successfully!")
      setIsTaskSubmitted(true)
    } catch (err) {
      console.error("Error submitting task instructions:", err)
      alert("Failed to submit task instructions. Please try again.")
    } finally {
      setIsSubmittingTask(false)
    }
  }

  // Webcam Functions

  // Start webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: useFrontCamera ? "user" : "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsWebcamActive(true)
      }
    } catch (err) {
      setError("Could not access webcam. Please check permissions.")
    }
  }

  // Stop webcam
  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
      setIsWebcamActive(false)
    }
  }

  // Toggle Camera Button
  const toggleCamera = () => {
    setUseFrontCamera((prev) => !prev);
    stopWebcam(); // Stop current stream
    setTimeout(startWebcam, 500); // Restart with new camera
  };

  // Capture and send image for instruction tracking
  const captureAndSendImage = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("Webcam is not active")
      return
    }

    setIsCapturing(true)
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) {
      setError("Could not access canvas context")
      setIsCapturing(false)
      return
    }

    // Draw current video frame on canvas
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => blob && resolve(blob), "image/jpeg", 0.9)
      })

      const formData = new FormData()
      formData.append("user_id", "12345")
      formData.append("frame", blob, "webcam-frame.jpg")

      const response = await fetch(`${baseURL}/instruction/track/`, { method: "POST", body: formData })
      if (!response.ok) throw new Error(`Server responded with ${response.status}`)
      const data = await response.json()
      setResponses([{ id: `response-${Date.now()}`, timestamp: new Date().toLocaleTimeString(), text: data.response }, ...responses])
    } catch (err) {
      setError("Failed to send image. Please try again.")
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Saved Tasks - Collapsible Section */}
      <Card className="p-6">
        <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsTasksOpen(!isTasksOpen)}>
          <h2 className="text-2xl font-bold">Predefined & Saved Tasks</h2>
          {isTasksOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>

        {isTasksOpen && (
          <ScrollArea className={`mt-4 transition-all duration-300 ease-in-out ${tasks.length > 6 ? "h-auto max-h-[300px]" : `h-[${Math.ceil(tasks.length / 6) * 50}px]`}`}>
            {tasks.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {tasks.map((task) => (
                  <div key={task.id} className="relative group">
                    <Button
                      className="w-full p-1 text-xs sm:text-sm md:text-base text-center h-12 flex items-center justify-center truncate"
                      onClick={() => loadTask(task)}
                    >
                      {task.title}
                    </Button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="absolute right-1 top-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground mt-2">No tasks available.</p>
            )}
          </ScrollArea>
        )}
      </Card>


      {/* New Task Creation Section */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Create or Edit Task</h2>
        <Input
          placeholder="Enter task title"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          className="w-full mb-6"
        />
        {instructionSteps.map((step, index) => (
          <div key={step.id} className="p-4 border rounded-lg mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">Step {index + 1}</h4>
              <Button variant="ghost" size="sm" onClick={() => removeInstructionStep(step.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={step.text}
              onChange={(e) => updateStepText(step.id, e.target.value)}
            />
          </div>
        ))}
        <Button onClick={addInstructionStep} className="w-full mb-4">
          <Plus className="h-4 w-4" /> Add Another Step
        </Button>
        <div className="flex flex-col gap-2">
          <Button onClick={saveTask} disabled={isSavingTask} className="w-full">
            <Save className="h-4 w-4" /> {isSavingTask ? "Saving..." : "Save Task"}
          </Button>
          <Button onClick={submitTaskInstructions} disabled={isSubmittingTask} className="w-full">
            <Send className="h-4 w-4" /> {isSubmittingTask ? "Submitting..." : "Submit Task"}
          </Button>
        </div>
      </Card>

      {/* Webcam Section - Only show if task submitted */}
      {isTaskSubmitted && (
        <div className="flex flex-col md:flex-row space-y-4 md:space-x-6 h-screen overflow-hidden">
          {/* Webcam Controls - Stacks on mobile, side-by-side on desktop */}
          <Card className="p-6 w-full md:w-2/3 flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-4">Task Execution</h2>
            <div className="flex flex-col md:flex-row md:justify-between items-center space-y-2 md:space-y-0">
              {!isWebcamActive ? (
                <Button onClick={startWebcam} className="flex items-center gap-2 w-full md:w-auto">
                  <Camera className="h-4 w-4" /> Start Webcam
                </Button>
              ) : (
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <Button onClick={captureAndSendImage} disabled={isCapturing} className="flex items-center gap-2">
                    <CameraIcon className="h-4 w-4" /> {isCapturing ? "Processing..." : "Capture & Send"}
                  </Button>
                  <Button onClick={stopWebcam} variant="outline" className="flex items-center gap-2">
                    Stop Webcam
                  </Button>
                  <Button onClick={toggleCamera} variant="outline" className="flex items-center gap-2">
                    Switch Camera
                  </Button>
                </div>
              )}
            </div>

            {/* Webcam Feed - Scales Properly */}
            <div className="flex-grow flex items-center justify-center">
              <div className="w-full h-auto aspect-video bg-black rounded-md border overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            </div>
          </Card>

          {/* Response Section - Stacks below webcam on mobile */}
          <Card className="p-6 w-full md:w-1/3 flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-4">Responses</h2>
            <ScrollArea className="flex-grow pr-4">
              {responses.length > 0 ? (
                responses.map((response) => (
                  <div key={response.id} className="p-4 border rounded-lg mb-2">{response.text}</div>
                ))
              ) : (
                <p className="text-muted-foreground">No responses yet.</p>
              )}
            </ScrollArea>
          </Card>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
