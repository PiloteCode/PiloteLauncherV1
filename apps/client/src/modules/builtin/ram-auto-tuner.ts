import type { PiloteModule } from '../sdk';

/** Half of system RAM, capped at 8 GB, rounded to 512 MB, floored at 2 GB. */
function recommendMb(totalMb: number): number {
  const capped = Math.min(Math.floor(totalMb / 2), 8192);
  return Math.max(2048, Math.floor(capped / 512) * 512);
}

const gb = (mb: number): string => (mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1);

/** Reads system RAM and suggests (and can apply) a sensible per-instance allocation. */
export const ramAutoTuner: PiloteModule = {
  id: 'ram-auto-tuner',
  async setup(ctx) {
    let totalMb = 0;
    try {
      totalMb = await ctx.capabilities.systemMemoryMb();
    } catch {
      totalMb = 0;
    }
    const rec = recommendMb(totalMb || 8192);

    ctx.ui.setSummary(
      totalMb ? `Recommandé : ${gb(rec)} Go (sur ${gb(totalMb)} Go)` : 'Mémoire système inconnue',
    );

    ctx.ui.setActions([
      {
        label: 'Appliquer à toutes les instances',
        onClick: async () => {
          const list = ctx.launcher.instances();
          if (list.length === 0) {
            ctx.toast('Aucune instance à régler', 'info');
            return;
          }
          for (const inst of list) {
            await ctx.launcher.setInstanceRam(inst.id, rec);
          }
          ctx.toast(
            `RAM réglée à ${gb(rec)} Go pour ${list.length} instance${list.length > 1 ? 's' : ''}`,
            'success',
          );
        },
      },
    ]);
  },
};
