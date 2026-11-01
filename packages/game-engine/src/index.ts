import type { GamePhase, PublicSessionState } from "@misthy/shared";

/**
 * Boundary for future mini-game implementations. Phase 01 deliberately defines
 * the contract only; phase transitions and scoring arrive in later phases.
 */
export interface GameDefinition<TCommand, TState extends PublicSessionState> {
  readonly id: string;
  readonly initialPhase: GamePhase;
  applyCommand(state: Readonly<TState>, command: TCommand, now: number): TState;
  projectPublicState(state: Readonly<TState>, now: number): PublicSessionState;
}
