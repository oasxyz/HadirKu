import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';

import { dummyAttendances, dummySessions, dummyUsers } from '@/data/dummy';
import type { AppAction, AppState } from '@/types';

const initialState: AppState = {
  currentUserId: dummyUsers[0].id,
  users: dummyUsers,
  sessions: dummySessions,
  attendances: dummyAttendances,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'OPEN_SESSION':
      // TODO (F3 - Yustinus): generate kodeSesi 6 digit, ubah status ke 'dibuka'
      return state;
    case 'CLOSE_SESSION':
      // TODO (F3 - Yustinus): ubah status ke 'ditutup'
      return state;
    case 'SUBMIT_ATTENDANCE':
      // TODO (F4 - Varissa): validasi kodeSesi & cegah presensi ganda, tambah attendance.
      // Sejak jadwal difilter per-user (lihat src/types/index.ts: Session.pesertaIds),
      // presensi juga harus ditolak kalau action.userId tidak ada di
      // session.pesertaIds sesi terkait, bukan cuma cek kode & duplikat.
      return state;
    case 'SWITCH_USER':
      return { ...state, currentUserId: action.userId };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext harus dipakai di dalam AppProvider');
  }
  return ctx;
}
