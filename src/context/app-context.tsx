import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';

import { dummyAttendances, dummySessions, dummyUsers } from '@/data/dummy';
import type { AppAction, AppState, Attendance } from '@/types';

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
    case 'SUBMIT_ATTENDANCE': {
      const session = state.sessions.find((s) => s.id === action.sessionId);
      if (!session) return state;
      if (session.status !== 'dibuka') return state;
      if (session.kodeSesi !== action.kodeSesi) return state;
      if (!session.pesertaIds.includes(action.userId)) return state;

      const sudahHadir = state.attendances.some(
        (a) => a.sessionId === action.sessionId && a.userId === action.userId
      );
      if (sudahHadir) return state;

      const newAttendance: Attendance = {
        id: `att-${Date.now()}`,
        sessionId: action.sessionId,
        userId: action.userId,
        waktuPresensi: new Date().toISOString(),
      };

      return {
        ...state,
        attendances: [...state.attendances, newAttendance],
      };
    }
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