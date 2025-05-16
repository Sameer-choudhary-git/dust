"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trophy, Award, Gift, Star } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

export default function Achievements() {
  const [open, setOpen] = useState(false)

  const achievements = [
    {
      id: 1,
      title: "Dust Collector",
      description: "Collect dust from 5 different tokens",
      icon: Trophy,
      progress: 80,
      completed: false,
    },
    {
      id: 2,
      title: "Generous Donor",
      description: "Donate dust worth $10 or more",
      icon: Gift,
      progress: 15,
      completed: false,
    },
    {
      id: 3,
      title: "Staking Master",
      description: "Stake dust for at least 30 days",
      icon: Star,
      progress: 0,
      completed: false,
    },
    {
      id: 4,
      title: "First Swap",
      description: "Complete your first dust swap",
      icon: Award,
      progress: 100,
      completed: true,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Achievements
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your Achievements</DialogTitle>
          <DialogDescription>Complete tasks to earn badges and rewards</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {achievements.map((achievement) => (
            <div key={achievement.id} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
              <div
                className={`w-10 h-10 rounded-full ${achievement.completed ? "bg-yellow-500" : "bg-gray-700"} flex items-center justify-center`}
              >
                <achievement.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{achievement.title}</div>
                  <div className="text-xs">{achievement.progress}%</div>
                </div>
                <div className="text-xs text-gray-400 mb-2">{achievement.description}</div>
                <Progress value={achievement.progress} className="h-1.5" />
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
