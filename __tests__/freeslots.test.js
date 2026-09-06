'use strict';

const { freeSlots } = require('../lib/freeslots');

const DAY = ['2026-09-11T09:00:00', '2026-09-11T17:00:00'];

function spans(slots) {
  return slots.map((s) => `${s.start.slice(11, 16)}-${s.end.slice(11, 16)}`);
}

describe('lib/freeslots', () => {
  test('an empty day is free end to end', () => {
    expect(spans(freeSlots([], ...DAY))).toEqual(['09:00-17:00']);
  });

  test('a booking splits the day around it', () => {
    const busy = [{ start: '2026-09-11T12:00:00', end: '2026-09-11T13:00:00' }];
    expect(spans(freeSlots(busy, ...DAY))).toEqual(['09:00-12:00', '13:00-17:00']);
  });

  test('overlapping bookings are one busy stretch, not two gaps', () => {
    const busy = [
      { start: '2026-09-11T12:00:00', end: '2026-09-11T13:30:00' },
      { start: '2026-09-11T13:00:00', end: '2026-09-11T14:00:00' },
    ];
    expect(spans(freeSlots(busy, ...DAY))).toEqual(['09:00-12:00', '14:00-17:00']);
  });

  test('back to back bookings leave no gap between them', () => {
    const busy = [
      { start: '2026-09-11T12:00:00', end: '2026-09-11T13:00:00' },
      { start: '2026-09-11T13:00:00', end: '2026-09-11T14:00:00' },
    ];
    expect(spans(freeSlots(busy, ...DAY))).toEqual(['09:00-12:00', '14:00-17:00']);
  });

  test('bookings out of order are handled, since input order is not promised', () => {
    const busy = [
      { start: '2026-09-11T15:00:00', end: '2026-09-11T16:00:00' },
      { start: '2026-09-11T10:00:00', end: '2026-09-11T11:00:00' },
    ];
    expect(spans(freeSlots(busy, ...DAY))).toEqual(['09:00-10:00', '11:00-15:00', '16:00-17:00']);
  });

  test('a booking covering the range leaves nothing free', () => {
    const busy = [{ start: '2026-09-11T08:00:00', end: '2026-09-11T18:00:00' }];
    expect(freeSlots(busy, ...DAY)).toEqual([]);
  });

  test('bookings reaching past the range are clipped to it', () => {
    const busy = [
      { start: '2026-09-11T07:00:00', end: '2026-09-11T10:00:00' },
      { start: '2026-09-11T16:00:00', end: '2026-09-11T20:00:00' },
    ];
    expect(spans(freeSlots(busy, ...DAY))).toEqual(['10:00-16:00']);
  });

  test('a gap reports how long it is', () => {
    const busy = [{ start: '2026-09-11T12:00:00', end: '2026-09-11T13:00:00' }];
    expect(freeSlots(busy, ...DAY).map((s) => s.minutes)).toEqual([180, 240]);
  });

  test('a range that ends before it starts has no free time', () => {
    expect(freeSlots([], '2026-09-11T17:00:00', '2026-09-11T09:00:00')).toEqual([]);
  });

  test('a booking with no duration is ignored rather than splitting the day', () => {
    const busy = [{ start: '2026-09-11T12:00:00', end: '2026-09-11T12:00:00' }];
    expect(spans(freeSlots(busy, ...DAY))).toEqual(['09:00-17:00']);
  });
});
