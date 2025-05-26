"use client";

import { NextStep } from "nextstepjs";
import { tourSteps } from "@/lib/tourSteps";

interface NextStepWrapperProps {
  children: React.ReactNode;
}

export default function NextStepWrapper({ children }: NextStepWrapperProps) {
  return (
    <NextStep 
      steps={tourSteps}
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
