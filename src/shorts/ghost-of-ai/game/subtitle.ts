// The ghost has no spoken voice here: its lines are English subtitles, revealed
// at a reading pace. The "(from below)" aside shows at once, and a muffled line
// comes through a little slower.

/** Called with how many characters of the line are showing so far. */
export type Progress = (chars: number) => void;

const CHARS_PER_SEC = 9;

export function revealLine(text: string, onProgress: Progress, opts: { muffled?: boolean } = {}) {
  let raf = 0;
  let timer = 0;
  const lead = text.match(/^\([^)]*\)\s*/)?.[0].length ?? 0;
  const speed = CHARS_PER_SEC * (opts.muffled ? 0.8 : 1);
  const since = performance.now();

  const done = new Promise<void>((resolve) => {
    const tick = () => {
      onProgress(Math.min(text.length, lead + ((performance.now() - since) / 1000) * speed));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    timer = window.setTimeout(() => {
      cancelAnimationFrame(raf);
      onProgress(text.length);
      resolve();
    }, ((text.length - lead) / speed) * 1000 + 300);
  });

  return {
    done,
    cancel() {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    },
  };
}
