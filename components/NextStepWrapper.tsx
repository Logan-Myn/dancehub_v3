"use client";

import { NextStep } from "nextstepjs";
import { tourSteps } from "@/lib/tourSteps";

interface NextStepWrapperProps {
  children: React.ReactNode;
}

// Global callback for step changes - this will be used by the community page
let globalStepChangeCallback: ((stepIndex: number, tourName: string) => void) | null = null;

export function setStepChangeCallback(callback: (stepIndex: number, tourName: string) => void) {
  globalStepChangeCallback = callback;
}

export function clearStepChangeCallback() {
  globalStepChangeCallback = null;
}

export default function NextStepWrapper({ children }: NextStepWrapperProps) {
  return (
    <NextStep 
      steps={tourSteps}
      onStepChange={(stepIndex, tourName) => {
        console.log('NextStep - Step changed to index:', stepIndex, 'Tour:', tourName);
        if (globalStepChangeCallback && tourName) {
          globalStepChangeCallback(stepIndex, tourName);
        }
      }}
      onComplete={(tourName) => {
        // Mark tour as completed in localStorage
        if (tourName === 'onboarding') {
          console.log('Onboarding tour completed');
        }
      }}
      onSkip={(step, tourName) => {
        // Mark tour as completed even if skipped
        if (tourName === 'onboarding') {
          console.log('Onboarding tour skipped at step', step);
        }
      }}
    >
      {children}
    </NextStep>
  );
}
