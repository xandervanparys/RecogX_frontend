"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, X, Send, ChevronDown, ChevronUp, Save, Trash2 } from "lucide-react"

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
  const [isSavingTask, setIsSavingTask] = useState(false)
  const [isTasksOpen, setIsTasksOpen] = useState(false)
  const baseURL = "https://api.web-present.be"

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

  // Load a predefined or saved task
  const loadTask = (task: Task) => {
    setTaskTitle(task.title)
    setInstructionSteps(task.steps.map((step, index) => ({ id: `step-${index + 1}`, text: step })))
  }

  // Save a task
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

  // Add a new step
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

  // Submit task to backend for execution tracking
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
      formData.append("user_id", "12345")
      formData.append("task_title", taskTitle)
      instructionSteps.forEach((step) => formData.append("instructions", step.text))

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
      {/* Predefined Tasks - Collapsible Section */}
      <Card className="p-6">
        <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsTasksOpen(!isTasksOpen)}>
          <h2 className="text-2xl font-bold">Predefined & Saved Tasks</h2>
          {isTasksOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>

        {isTasksOpen && (
          <ScrollArea className="h-[200px] mt-4">
            {tasks.length > 0 ? (
              <div className="grid grid-cols-6 gap-2">
                {tasks.map((task) => (
                  <div key={task.id} className="relative group">
                    <Button
                      className="w-full p-2 text-sm font-medium text-center h-12 flex items-center justify-center"
                      onClick={() => loadTask(task)}
                    >
                      {task.title}
                    </Button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="absolute right-1 top-3 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Task Setup */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Create or Edit Task</h2>

        <Input placeholder="Enter task title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="w-full mb-6" />

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

        <Button onClick={saveTask} disabled={isSavingTask} className="w-full mb-4">
          <Save className="h-4 w-4" /> {isSavingTask ? "Saving..." : "Save Task"}
        </Button>

        <Button onClick={submitTaskInstructions} disabled={isSubmittingTask} className="w-full">
          <Send className="h-4 w-4" /> {isSubmittingTask ? "Submitting..." : "Submit Task"}
        </Button>
      </Card>
    </div>
  )
}
