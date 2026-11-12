import { Badge } from '@/components/ui';
import type { SessionStatus } from '@/types';

const LABELS: Record<SessionStatus, string> = {
  belum_dibuka: 'Belum Dibuka',
  dibuka: 'Sedang Dibuka',
  ditutup: 'Ditutup',
};

const TONES: Record<SessionStatus, 'grey' | 'green' | 'red'> = {
  belum_dibuka: 'grey',
  dibuka: 'green',
  ditutup: 'red',
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  return <Badge label={LABELS[status]} tone={TONES[status]} />;
}
