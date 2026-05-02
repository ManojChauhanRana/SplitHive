import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-gray-300 ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "flex h-11 w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2 text-sm text-white transition-all ring-offset-gray-900",
            "placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:ring-red-500/20",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
