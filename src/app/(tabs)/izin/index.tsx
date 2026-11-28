import { PemeriksaanIzin } from '@/components/izin/pemeriksaan-izin';
import { PengajuanIzin } from '@/components/izin/pengajuan-izin';
import { useCurrentUser } from '@/context/auth-context';
import { isStafLab } from '@/types';

// Pemisah peran saja. Isi tiap peran dikerjakan di komponennya masing-masing.
export default function IzinScreen() {
  const currentUser = useCurrentUser();

  return isStafLab(currentUser?.role) ? <PemeriksaanIzin /> : <PengajuanIzin />;
}
