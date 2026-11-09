import { EyeIcon, EyeOffIcon } from '@/components/auth/AuthIcons';

interface PasswordToggleProps {
  /** id of the input it shows or hides. */
  controls: string;
  visible: boolean;
  onToggle: () => void;
  /** What the field holds, used in the button name: "Mostrar <label>". */
  label: string;
}

// Eye button inside a password field that switches it between dots and plain text.
// The input next to it needs right padding (pr-10) so the text does not run under it.
export default function PasswordToggle({ controls, visible, onToggle, label }: PasswordToggleProps) {
  const name = `${visible ? 'Ocultar' : 'Mostrar'} ${label}`;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-controls={controls}
      aria-pressed={visible}
      aria-label={name}
      title={name}
      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
    >
      {visible ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}
