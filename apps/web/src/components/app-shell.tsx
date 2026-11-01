import { motion, useReducedMotion } from "motion/react";
import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "../lib/utils";
import { AmbientBackground } from "./ambient-background";
import { GlassNavbar } from "./glass-navbar";

export function AppShell({
  children,
  action,
  compactNav = false,
  className,
  bottomBar,
}: PropsWithChildren<{
  action?: ReactNode;
  compactNav?: boolean;
  className?: string;
  bottomBar?: ReactNode;
}>) {
  const reduceMotion = useReducedMotion();
  return (
    <main
      className={cn(
        "relative min-h-dvh overflow-x-clip px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-8",
        className,
      )}
    >
      <AmbientBackground />
      <GlassNavbar action={action} compact={compactNav} />
      <motion.div
        className="relative z-10 mx-auto max-w-7xl"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 24 }}
      >
        {children}
      </motion.div>
      {bottomBar}
    </main>
  );
}
