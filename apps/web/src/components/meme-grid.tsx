import type { ComponentProps } from "react";
import { cn } from "../lib/utils";
export function MemeGrid({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("meme-grid", className)} {...props} />;
}
