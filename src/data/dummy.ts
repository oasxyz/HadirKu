import type { Attendance, Session, User } from '@/types';

export const dummyUsers: User[] = [
  { id: 'u-annis', nama: 'Annis Fakhiroh', nim: '21120001', role: 'asisten' },
  { id: 'u-yoas', nama: 'Yoas (PM)', nim: '21120000', role: 'asisten' },
  { id: 'u-yustinus', nama: 'Yustinus Hendi', nim: '21120002', role: 'praktikan' },
  { id: 'u-varissa', nama: 'Varissa Nabila', nim: '21120003', role: 'praktikan' },
];

export const dummySessions: Session[] = [
  {
    id: 's-1',
    praktikum: 'Praktikum Jaringan Komputer',
    kelasLab: 'Lab 2 (Lantai 3)',
    tanggal: '2026-10-27',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    asistenId: 'u-annis',
    kodeSesi: null,
    status: 'belum_dibuka',
  },
  {
    id: 's-2',
    praktikum: 'Sistem Basis Data',
    kelasLab: 'Lab 1 (Lantai 2)',
    tanggal: '2026-10-28',
    jamMulai: '13:00',
    jamSelesai: '15:00',
    asistenId: 'u-annis',
    kodeSesi: null,
    status: 'belum_dibuka',
  },
];

export const dummyAttendances: Attendance[] = [];
