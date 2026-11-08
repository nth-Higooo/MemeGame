import type { GamePhase } from "@misthy/shared";
import { getMessages } from "../i18n";

const steps = ["QUESTION", "SUBMITTING", "REVEAL", "VOTING", "RESULT"] as const;

export function RoundFlow({ phase, talent = false }: { phase: GamePhase; talent?: boolean }) {
  const copy = getMessages().player;
  const current = phase === "LEADERBOARD" || phase === "FINISHED" ? "RESULT" : phase;
  return (
    <ol className="round-flow" aria-label={copy.flowLabel}>
      {steps.map((step, index) => (
        <li key={step} aria-current={step === current ? "step" : undefined}>
          <span aria-hidden="true">{index + 1}</span>
          {step === "VOTING" && talent ? copy.talentDecision : copy.steps[step]}
        </li>
      ))}
    </ol>
  );
}
