"use client"

import { Progress } from "@/components/ui/progress"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface BookingStepperProps {
  steps: string[]
  currentStep: number
  direction: "forward" | "backward"
  children: React.ReactNode
}

export function BookingStepper({
  steps,
  currentStep,
  direction,
  children,
}: BookingStepperProps) {
  const progressValue = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="flex flex-col gap-5">
      {/* Progress bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Passo {currentStep + 1} de {steps.length}</span>
          <span className="font-medium text-foreground">{steps[currentStep]}</span>
        </div>
        <Progress value={progressValue} className="h-1.5" />
      </div>

      {/* Step indicators */}
      <div className="hidden sm:flex items-center justify-center gap-1.5">
        {steps.map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all duration-300",
              index < currentStep
                ? "bg-primary/20 text-primary"
                : index === currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground",
            )}
          >
            {index < currentStep ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              index + 1
            )}
          </div>
        ))}
      </div>

      {/* Step content with animation */}
      <div
        key={currentStep}
        className={cn(
          "animate-in fade-in duration-300",
          direction === "forward" ? "slide-in-from-right-4" : "slide-in-from-left-4",
        )}
      >
        {children}
      </div>
    </div>
  )
}
