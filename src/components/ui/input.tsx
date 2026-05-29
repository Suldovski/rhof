import * as React from "react";

import { cn } from "@/lib/utils";
import { toCaps } from "@/lib/caps";

const UPPERCASE_TYPES = new Set([
  "text",
  "search",
  "email",
  "tel",
  "url",
  "textarea",
]);

const EXCLUDED_TYPES = new Set([
  "date",
  "datetime-local",
  "month",
  "time",
  "week",
  "number",
  "range",
  "file",
  "password",
  "checkbox",
  "radio",
  "hidden",
]);

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, autoCapitalize, ...props }, ref) => {
    const inputType = type ?? "text";
    const shouldUppercase = !EXCLUDED_TYPES.has(inputType) && UPPERCASE_TYPES.has(inputType);

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      if (shouldUppercase) {
        event.currentTarget.value = toCaps(event.currentTarget.value);
      }
      onChange?.(event);
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base uppercase shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        autoCapitalize={autoCapitalize ?? (shouldUppercase ? "characters" : undefined)}
        onChange={handleChange}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
