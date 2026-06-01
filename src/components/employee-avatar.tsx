import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";

type Size = "sm" | "md" | "lg" | "xl";

const sizeMap: Record<Size, string> = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
  lg: "h-20 w-20",
  xl: "h-24 w-24",
};

export function EmployeeAvatar({ src, name, size = "md", className = "" }: { src?: string; name: string; size?: Size; className?: string }) {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  return (
    <Avatar className={`${sizeMap[size]} ${className}`}>
      {src ? (
        <AvatarImage src={src} alt={name} />
      ) : (
        <AvatarFallback>{initials}</AvatarFallback>
      )}
    </Avatar>
  );
}

export default EmployeeAvatar;
