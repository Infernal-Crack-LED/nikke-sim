import { useEffect, useRef, useState } from 'react';

// Inline replacement for the native window.prompt() name dialogs — a text field
// that pops in right where the action lives, commits on Enter / ✓, and cancels on
// Escape / ×. The parent owns visibility (mounts/unmounts it); this component
// owns the draft value. Deliberately no blur-to-cancel: clicking the ✓/× buttons
// would race the blur and swallow the commit.
export function InlineNameField({
  initial,
  placeholder = 'name',
  onCommit,
  onCancel,
}: {
  initial: string;
  placeholder?: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const commit = () => {
    const name = val.trim();
    if (name) onCommit(name);
  };

  return (
    <span className='inline-name'>
      <input
        ref={ref}
        type='text'
        value={val}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          else if (e.key === 'Escape') onCancel();
        }}
      />
      <button
        type='button'
        className='inline-name-ok'
        title='save'
        onClick={commit}
      >
        ✓
      </button>
      <button
        type='button'
        className='inline-name-x'
        title='cancel'
        onClick={onCancel}
      >
        ×
      </button>
    </span>
  );
}
