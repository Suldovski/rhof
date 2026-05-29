import * as React from "react";

import { cn } from "@/lib/utils";
import { toCaps } from "@/lib/caps";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, onChange, autoCapitalize, ...props }, ref) => {
    const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (event) => {
      event.currentTarget.value = toCaps(event.currentTarget.value);
      onChange?.(event);
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base uppercase shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        autoCapitalize={autoCapitalize ?? "characters"}
        onChange={handleChange}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
