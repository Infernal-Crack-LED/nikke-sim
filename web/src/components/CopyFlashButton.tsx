import { useEffect, useRef, useState } from 'react';

// A share/copy button that flashes "✓ Copied" for 1.5s after a successful
// copy — the same feedback the header share buttons give (App.tsx flashImaged
// / .share-btn.copied in styles.css), packaged so every in-page Copy image
// button on the calculator tabs behaves identically without each one carrying
// its own flash state.
//
// The flash is skipped when the copy pipeline reports 'unsupported' (no
// canvas / no clipboard AND no download) — matching the header buttons, which
// only flash when something actually reached the user. A 'downloaded' result
// counts as success: the file landed, the label just says Copied like it does
// everywhere else on the site.

export type CopyResult = 'copied' | 'downloaded' | 'unsupported';

const FLASH_MS = 1500;

export function CopyFlashButton({
  label,
  copiedLabel = '✓ Copied',
  onCopy,
  className = 'share-btn',
  disabled,
  title,
}: {
  label: string;
  copiedLabel?: string;
  // Returns the copy pipeline's result when it has one; a void return is
  // treated as success (the caller already decided it worked).
  onCopy: () => Promise<CopyResult | void> | CopyResult | void;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const [flash, setFlash] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The copy is async, so the tab can change (or the result block can
  // re-render away) between click and resolve — clear the pending timer on
  // unmount so it never sets state on a dead component.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    []
  );

  const run = async () => {
    const res = await onCopy();
    if (res === 'unsupported') {
      return;
    }
    setFlash(true);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setFlash(false), FLASH_MS);
  };

  return (
    <button
      className={className + (flash ? ' copied' : '')}
      disabled={disabled}
      title={title}
      onClick={() => void run()}
    >
      {flash ? copiedLabel : label}
    </button>
  );
}
