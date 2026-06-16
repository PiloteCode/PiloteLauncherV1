import { z } from 'zod';

/**
 * Supported Minecraft mod loaders. `vanilla` means no loader.
 * Fabric is the priority loader; the others are fully supported by the core installer.
 */
export const ModLoaderSchema = z.enum(['vanilla', 'fabric', 'forge', 'neoforge', 'quilt']);
export type ModLoader = z.infer<typeof ModLoaderSchema>;

/** Display accent dot per loader, derived from the Halcyon design tokens. */
export const LOADER_DOT_COLOR: Record<ModLoader, string> = {
  vanilla: '#9aceb1',
  fabric: '#cbb287',
  forge: '#9aa0a6',
  neoforge: '#e8a33d',
  quilt: '#b79cf2',
};

export const LOADER_LABEL: Record<ModLoader, string> = {
  vanilla: 'Vanilla',
  fabric: 'Fabric',
  forge: 'Forge',
  neoforge: 'NeoForge',
  quilt: 'Quilt',
};

/**
 * Java major version required by a given Minecraft version range.
 *  - MC >= 1.20.5  -> Java 21
 *  - MC 1.17–1.20.4 -> Java 17
 *  - MC <= 1.16    -> Java 8
 */
export const JavaMajorSchema = z.union([z.literal(8), z.literal(17), z.literal(21)]);
export type JavaMajor = z.infer<typeof JavaMajorSchema>;
