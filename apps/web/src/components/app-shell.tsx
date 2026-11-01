import { motion, useReducedMotion } from "motion/react";
import type { PropsWithChildren, ReactNode } from "react";
import { Brand } from "./brand";

export function AppShell({ children, action }: PropsWithChildren<{ action?: ReactNode }>) {
  const reduceMotion = useReducedMotion();
  return (
    <main className="relative min-h-dvh overflow-hidden px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-7">
      <div aria-hidden="true" className="ambient ambient-one" />
      <div aria-hidden="true" className="ambient ambient-two" />
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between rounded-[1.4rem] border border-white/70 bg-white/46 px-3 py-2.5 shadow-[0_14px_50px_rgba(82,64,111,.1)] backdrop-blur-2xl sm:px-5">
        <Brand />
        {action}
      </nav>
      <motion.div
        className="relative z-10 mx-auto max-w-7xl"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 130, damping: 20 }}
      >
        {children}
      </motion.div>
    </main>
  );
}
