"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * The "nothing here yet" state.
 *
 * Panels spend much of their life empty — before a clip is selected, before an
 * effect is added. Left as a bare sentence in the corner, an empty panel reads
 * as broken rather than ready. A consistent icon, title, and hint distinguishes
 * the two and, where there is one, names the next action.
 */
export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  /** What to do next, when there is something worth naming. */
  hint?: string;
  className?: string;
}

export function EmptyState({ icon, title, hint, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1.5 px-4 py-8 text-center", className)}>
      {icon && <span className="text-text-tertiary/50">{icon}</span>}
      <p className="text-text-secondary text-xs font-medium">{title}</p>
      {hint && <p className="text-text-tertiary text-2xs max-w-[210px] leading-relaxed">{hint}</p>}
    </div>
  );
}
