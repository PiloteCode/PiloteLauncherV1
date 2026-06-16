import { EventEmitter } from 'node:events';
import type { LaunchStage, ProgressEvent } from '@pilote/types';

/** Callback invoked for every {@link ProgressEvent} emitted by the pipeline. */
export type ProgressCallback = (event: ProgressEvent) => void;

/**
 * Relative weights of each pipeline stage when computing the overall percent.
 * Tuned so the bar advances smoothly: downloads (vanilla/sync) dominate.
 */
export const STAGE_WEIGHTS: Record<LaunchStage, number> = {
  resolve: 2,
  java: 12,
  vanilla: 34,
  loader: 12,
  sync: 34,
  launch: 4,
  running: 2,
  done: 0,
};

/** Ordered stages used to accumulate the "already completed" portion of the bar. */
const STAGE_ORDER: LaunchStage[] = [
  'resolve',
  'java',
  'vanilla',
  'loader',
  'sync',
  'launch',
  'running',
  'done',
];

const TOTAL_WEIGHT = STAGE_ORDER.reduce((sum, s) => sum + STAGE_WEIGHTS[s], 0);

/**
 * Compute the overall pipeline percent (0–100) given the current stage and its
 * local fraction. Stages before the current one are counted as fully complete,
 * the current stage contributes its fractional weight, and later stages count 0.
 */
export function computeOverallPercent(stage: LaunchStage, fraction: number): number {
  const clampedFraction = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  const currentIndex = STAGE_ORDER.indexOf(stage);
  if (currentIndex < 0) return 0;

  let completed = 0;
  for (let i = 0; i < currentIndex; i += 1) {
    const s = STAGE_ORDER[i];
    if (s !== undefined) completed += STAGE_WEIGHTS[s];
  }
  const current = STAGE_WEIGHTS[stage] * clampedFraction;
  const percent = ((completed + current) / TOTAL_WEIGHT) * 100;
  return Math.max(0, Math.min(100, Math.round(percent * 100) / 100));
}

/** Local fraction (0–1) for a current/total pair, guarding against div-by-zero. */
export function fractionOf(current: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return current > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, current / total));
}

/**
 * A typed progress emitter bound to a single instance. Each stage reports its own
 * `current/total`; the reporter fills in the overall `percent` automatically using
 * the stage weights, so callers never compute it by hand.
 */
export class ProgressReporter {
  private readonly emitter = new EventEmitter();

  constructor(
    private readonly instanceId: string,
    callback?: ProgressCallback,
  ) {
    if (callback) {
      this.emitter.on('progress', callback);
    }
  }

  /** Subscribe to progress events. Returns an unsubscribe function. */
  on(cb: ProgressCallback): () => void {
    this.emitter.on('progress', cb);
    return () => {
      this.emitter.off('progress', cb);
    };
  }

  /** Emit a fully-formed progress event for a stage. */
  report(input: {
    stage: LaunchStage;
    label: string;
    current: number;
    total: number;
    speedBps?: number;
    file?: string;
  }): void {
    const fraction = fractionOf(input.current, input.total);
    const event: ProgressEvent = {
      instanceId: this.instanceId,
      stage: input.stage,
      label: input.label,
      current: input.current,
      total: input.total,
      percent: computeOverallPercent(input.stage, fraction),
      ...(input.speedBps !== undefined ? { speedBps: input.speedBps } : {}),
      ...(input.file !== undefined ? { file: input.file } : {}),
    };
    this.emitter.emit('progress', event);
  }

  /** Convenience: mark a stage as starting (0 of total). */
  start(stage: LaunchStage, label: string, total = 1): void {
    this.report({ stage, label, current: 0, total });
  }

  /** Convenience: mark a stage as fully complete. */
  complete(stage: LaunchStage, label: string): void {
    this.report({ stage, label, current: 1, total: 1 });
  }

  /** Build a child reporter that scopes a sub-task's progress into one stage's range. */
  forStage(stage: LaunchStage, label: string): StageReporter {
    return new StageReporter(this, stage, label);
  }
}

/** A thin helper that reports current/total within a single stage. */
export class StageReporter {
  constructor(
    private readonly parent: ProgressReporter,
    private readonly stage: LaunchStage,
    private readonly label: string,
  ) {}

  update(current: number, total: number, extra?: { speedBps?: number; file?: string; label?: string }): void {
    this.parent.report({
      stage: this.stage,
      label: extra?.label ?? this.label,
      current,
      total,
      ...(extra?.speedBps !== undefined ? { speedBps: extra.speedBps } : {}),
      ...(extra?.file !== undefined ? { file: extra.file } : {}),
    });
  }
}
