"use client";

import React from "react";
import { CheckCircle, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  title: string;
  description: string;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

export function ProgressIndicator({ 
  steps, 
  currentStep, 
  completedSteps, 
  onStepClick 
}: ProgressIndicatorProps) {
  const getStepStatus = (stepId: number) => {
    if (completedSteps.includes(stepId)) return "completed";
    if (stepId === currentStep) return "current";
    if (stepId < currentStep || completedSteps.includes(stepId - 1)) return "available";
    return "locked";
  };

  const canClickStep = (stepId: number) => {
    return stepId === 1 || completedSteps.includes(stepId - 1) || stepId <= currentStep;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Setup Progress</h3>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isClickable = canClickStep(step.id);
          
          return (
            <div key={step.id} className="relative">
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    "absolute left-4 top-8 h-8 w-0.5 bg-gray-300",
                    completedSteps.includes(step.id) && "bg-green-500"
                  )}
                />
              )}
              
              <button
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={cn(
                  "flex items-start gap-3 w-full text-left p-3 rounded-lg transition-colors",
                  isClickable && "hover:bg-gray-50",
                  status === "current" && "bg-blue-50 border border-blue-200",
                  !isClickable && "cursor-not-allowed opacity-60"
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {status === "completed" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : status === "current" ? (
                    <div className="h-5 w-5 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  ) : status === "available" ? (
                    <Circle className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Lock className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-medium text-sm",
                    status === "completed" && "text-green-700",
                    status === "current" && "text-blue-700",
                    status === "available" && "text-gray-700",
                    status === "locked" && "text-gray-400"
                  )}>
                    {step.title}
                  </div>
                  <div className={cn(
                    "text-xs mt-1",
                    status === "completed" && "text-green-600",
                    status === "current" && "text-blue-600",
                    status === "available" && "text-gray-500",
                    status === "locked" && "text-gray-300"
                  )}>
                    {step.description}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          <strong>Progress:</strong> {completedSteps.length} of {steps.length} steps completed
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Click on completed steps to review or edit information.
        </div>
      </div>
    </div>
  );
} 