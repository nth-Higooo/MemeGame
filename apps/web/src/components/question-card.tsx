import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { DecorativeSparkle } from "./celestial-background";

export function QuestionCard({
  children,
  label = "Tình huống",
  className,
  dark = false,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
  dark?: boolean;
}) {
  return (
    <section className={cn("question-card", dark && "question-card-dark", className)}>
      <div className="question-label">
        <DecorativeSparkle /> {label}
      </div>
      <p>{children}</p>
    </section>
  );
}
