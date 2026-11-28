// Sprint 4: peran baru (aslab, asprak) dan alias lama (asisten).
import { isAslabLike, isAsprakLike, isStafLab } from '@/types';

describe('helper peran', () => {
  it('asprak dan alias lama asisten adalah asprak', () => {
    expect(isAsprakLike('asprak')).toBe(true);
    expect(isAsprakLike('asisten')).toBe(true);
    expect(isAsprakLike('aslab')).toBe(false);
  });

  it('staf lab mencakup asprak, asisten, dan aslab, tetapi tidak praktikan', () => {
    expect(isStafLab('asprak')).toBe(true);
    expect(isStafLab('asisten')).toBe(true);
    expect(isStafLab('aslab')).toBe(true);
    expect(isStafLab('praktikan')).toBe(false);
    expect(isStafLab(undefined)).toBe(false);
  });

  it('hanya aslab yang aslab (Kelola Lab)', () => {
    expect(isAslabLike('aslab')).toBe(true);
    expect(isAslabLike('asprak')).toBe(false);
    expect(isAslabLike('asisten')).toBe(false);
  });
});
