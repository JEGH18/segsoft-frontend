import type { Severity } from '@/types/enums';

const SEVERITY_CLASSES: Record<Severity, string> = {
  CRITICAL: 'bg-neutral-900 text-white',
  HIGH: 'bg-neutral-700 text-white',
  MEDIUM: 'bg-neutral-400 text-white',
  LOW: 'bg-neutral-200 text-neutral-700',
};

interface Props {
  severity: Severity;
}

export default function SeverityBadge({ severity }: Props) {
  return (
    <span
      className={`badge ${SEVERITY_CLASSES[severity]}`}
      role={severity === 'CRITICAL' ? 'alert' : undefined}
    >
      {severity}
    </span>
  );
}
