import { PemeriksaanIzin } from '@/components/izin/pemeriksaan-izin';
import { PengajuanIzin } from '@/components/izin/pengajuan-izin';
import { useAppContext } from '@/context/app-context';

// Pemisah peran saja. Isi tiap peran dikerjakan di komponennya masing-masing.
export default function IzinScreen() {
  const { state } = useAppContext();
  const currentUser = state.users.find((user) => user.id === state.currentUserId);

  return currentUser?.role === 'asisten' ? <PemeriksaanIzin /> : <PengajuanIzin />;
}
