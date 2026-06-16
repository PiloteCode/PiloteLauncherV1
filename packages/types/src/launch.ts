import { z } from 'zod';

/** High-level stage of the install/launch pipeline (drives the download overlay UI). */
export const LaunchStageSchema = z.enum([
  'resolve', // resolving instance -> versions
  'java', // ensuring the correct JRE
  'vanilla', // installing client jar + libraries + assets + natives
  'loader', // installing Fabric/Forge/NeoForge/Quilt
  'sync', // diffing & downloading instance files
  'launch', // building command + spawning
  'running', // process alive
  'done',
]);
export type LaunchStage = z.infer<typeof LaunchStageSchema>;

/** Structured progress emitted for every step of the pipeline. */
export const ProgressEventSchema = z.object({
  instanceId: z.string(),
  stage: LaunchStageSchema,
  /** Human label, e.g. "Téléchargement des assets". */
  label: z.string(),
  current: z.number().nonnegative(),
  total: z.number().nonnegative(),
  /** Bytes per second for the current transfer, when applicable. */
  speedBps: z.number().nonnegative().optional(),
  /** Current file being processed. */
  file: z.string().optional(),
  /** Overall percent 0–100 across the whole pipeline. */
  percent: z.number().min(0).max(100),
});
export type ProgressEvent = z.infer<typeof ProgressEventSchema>;

/** JVM / launch configuration, resolvable globally and overridable per instance. */
export const LaunchOptionsSchema = z.object({
  minRamMb: z.number().int().min(512).optional(),
  maxRamMb: z.number().int().min(1024),
  /** Extra raw JVM args appended after the managed ones. */
  extraJvmArgs: z.array(z.string()).default([]),
  /** Override the JRE path (otherwise the launcher provisions one). */
  javaPath: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  fullscreen: z.boolean().optional(),
});
export type LaunchOptions = z.infer<typeof LaunchOptionsSchema>;

/** A streamed line from a running Minecraft session. */
export const LogLineSchema = z.object({
  instanceId: z.string(),
  /** "stdout" | "stderr" */
  channel: z.enum(['stdout', 'stderr']),
  line: z.string(),
  /** epoch ms */
  ts: z.number().int(),
});
export type LogLine = z.infer<typeof LogLineSchema>;

/** Emitted when a game process exits. */
export const SessionExitSchema = z.object({
  instanceId: z.string(),
  code: z.number().int().nullable(),
  signal: z.string().nullable(),
  /** True when we detected a crash (non-zero exit and/or log4j FATAL). */
  crashed: z.boolean(),
  /** Path to the saved session log file, for the crash viewer. */
  logPath: z.string().optional(),
});
export type SessionExit = z.infer<typeof SessionExitSchema>;
