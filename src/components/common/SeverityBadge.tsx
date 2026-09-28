import type { Severity } from '@/types/enums';
import { SEVERITY_COLOR_CLASSES } from '@/utils/severityColors';

interface Props {
  severity: Severity;
}

export default function SeverityBadge({ severity }: Props) {
  return (
    <span
      className={`badge border ${SEVERITY_COLOR_CLASSES[severity]}`}
      role={severity === 'CRITICAL' ? 'alert' : undefined}
    >
      {severity}
    </span>
  );
}
