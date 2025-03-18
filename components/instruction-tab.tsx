"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, X, Send } from "lucide-react"

// Define types for our tasks
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

export default function InstructionTab() {
  const [taskTitle, setTaskTitle] = useState("")
  const [instructionSteps, setInstructionSteps] = useState<InstructionStep[]>([{ id: "step-1", text: "" }])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)
  const baseURL = "https://api.web-present.be"

  // Fetch predefined tasks from the backend
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

  // Load a predefined task
  const loadTask = (task: Task) => {
    setTaskTitle(task.title)
    setInstructionSteps(task.steps.map((step, index) => ({ id: `step-${index + 1}`, text: step })))
  }

  // Manually add a new step
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

  // Submit task to backend
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
      instructionSteps.forEach((step) => {
        formData.append("instructions", step.text)
      })

      const response = await fetch(`${baseURL}/instruction/setup/`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error(`Server responded with ${response.status}`)

      alert("Task instructions submitted successfully!")
    } catch (err) {
      console.error("Error submitting task instructions:", err)
      alert("Failed to submit task instructions. Please try again.")
    } finally {
      setIsSubmittingTask(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Predefined Task Selection */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Predefined Tasks</h2>
        <ScrollArea className="h-[200px] pr-4">
          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <Button key={task.id} className="w-full" onClick={() => loadTask(task)}>
                  {task.title}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No predefined tasks available.</p>
          )}
        </ScrollArea>
      </Card>

      {/* Task Setup */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Task Setup</h2>

        {/* Task Title */}
        <Input
          placeholder="Enter task title"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          className="w-full mb-6"
        />

        {/* Instruction Steps */}
        {instructionSteps.map((step, index) => (
          <div key={step.id} className="p-4 border rounded-lg mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">Step {index + 1}</h4>
              <Button variant="ghost" size="sm" onClick={() => removeInstructionStep(step.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea value={step.text} onChange={(e) => updateStepText(step.id, e.target.value)} />
          </div>
        ))}

        <Button onClick={addInstructionStep} className="w-full mb-4">
          <Plus className="h-4 w-4" /> Add Another Step
        </Button>

        <Button onClick={submitTaskInstructions} disabled={isSubmittingTask} className="w-full">
          <Send className="h-4 w-4" /> {isSubmittingTask ? "Submitting..." : "Submit Task"}
        </Button>
      </Card>
    </div>
  )
}
