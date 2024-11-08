import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  // Adding specific props for our Textarea component
  className?: string;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, fullWidth, maxLength, showCharCount, ...props }, ref) => {
    const value = props.value as string || '';
    
    return (
      <div className={cn("relative", fullWidth && "w-full")}>
        <textarea
          className={cn(
            "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            error && "border-red-500",
            className
          )}
          ref={ref}
          maxLength={maxLength}
          {...props}
        />
        <div className="flex justify-between mt-1">
          {helperText && (
            <p className={cn(
              "text-xs",
              error ? "text-red-500" : "text-gray-500"
            )}>
              {helperText}
            </p>
          )}
          {showCharCount && maxLength && (
            <p className="text-xs text-gray-500">
              {value.length}/{maxLength}
            </p>
          )}
        </div>
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
