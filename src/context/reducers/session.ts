import type { Session } from '@/types';

export function openSession(sessions: Session[], sessionId: string): Session[] {
  return sessions.map((session) => {
    if (session.id !== sessionId || session.status !== 'belum_dibuka') {
      return session;
    }

    return {
      ...session,
      status: 'dibuka',
      kodeSesi: generateSessionCode(),
    };
  });
}

export function closeSession(sessions: Session[], sessionId: string): Session[] {
  return sessions.map((session) => {
    if (session.id !== sessionId || session.status !== 'dibuka') {
      return session;
    }

    return {
      ...session,
      status: 'ditutup',
      kodeSesi: null,
    };
  });
}

function generateSessionCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
