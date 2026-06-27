import {
  factoryDateKeyDayOfWeek,
  toFactoryDateKey,
  utcTimestampToLocalMinutes,
} from './timezone.util';

describe('timezone.util', () => {
  it('toFactoryDateKey uses UTC+3 calendar day', () => {
    // 2026-06-19 22:00 UTC = 2026-06-20 01:00 in UTC+3
    const key = toFactoryDateKey(new Date('2026-06-19T22:00:00.000Z'), 180);
    expect(key).toBe('2026-06-20');
  });

  it('utcTimestampToLocalMinutes converts correctly', () => {
    const minutes = utcTimestampToLocalMinutes(new Date('2026-06-20T05:30:00.000Z'), 180);
    expect(minutes).toBe(8 * 60 + 30);
  });

  it('factoryDateKeyDayOfWeek returns Friday for 2026-06-19', () => {
    expect(factoryDateKeyDayOfWeek('2026-06-19')).toBe(5);
  });
});
