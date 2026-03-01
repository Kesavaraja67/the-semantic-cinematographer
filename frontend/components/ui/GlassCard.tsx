"use client";
import { ReactNode } from "react";
import { clsx } from "clsx";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function GlassCard({ children, className, as: Tag = "div" }: GlassCardProps) {
  return (
    <Tag
      className={clsx(
        "glass rounded-2xl",
        className
      )}
    >
      {children}
    </Tag>
  );
}
