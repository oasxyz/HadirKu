import { Badge, type BadgeTone } from '@/components/ui';
import type { SessionStatus } from '@/types';

const LABELS: Record<SessionStatus, string> = {
  belum_dibuka: 'Belum Dibuka',
  dibuka: 'Sedang Dibuka',
  ditutup: 'Ditutup',
};

const TONES: Record<SessionStatus, BadgeTone> = {
  belum_dibuka: 'muted',
  dibuka: 'primary',
  ditutup: 'dark',
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  return <Badge label={LABELS[status]} tone={TONES[status]} />;
}
