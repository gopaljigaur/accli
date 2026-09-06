'use strict';

/**
 * Free time is the complement of busy time inside a range.
 *
 * The freebusy script reports what is booked; the gaps between those bookings
 * are what someone actually asks for, and computing them here keeps that in
 * the calendar rather than in whatever is consuming this.
 *
 * Deliberately no opinion about working hours: the answer is every minute of
 * the range that is not busy, so a caller wanting 09:00 to 18:00 asks for
 * that range. Overlapping and touching busy blocks are merged first, since
 * two meetings that overlap are one busy stretch, not two.
 *
 * Times are the same local wall-clock strings the rest of the output uses.
 */
function freeSlots(busy, from, to) {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

  const blocks = (busy || [])
    .map((slot) => ({
      start: new Date(slot.startISO || slot.start).getTime(),
      end: new Date(slot.endISO || slot.end).getTime(),
    }))
    .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end) && b.end > b.start)
    .sort((a, b) => a.start - b.start);

  const merged = [];
  for (const block of blocks) {
    const last = merged[merged.length - 1];
    if (last && block.start <= last.end) {
      last.end = Math.max(last.end, block.end);
    } else {
      merged.push({ ...block });
    }
  }

  const free = [];
  let cursor = start;
  for (const block of merged) {
    if (block.start > cursor) free.push({ start: cursor, end: Math.min(block.start, end) });
    cursor = Math.max(cursor, block.end);
    if (cursor >= end) break;
  }
  if (cursor < end) free.push({ start: cursor, end });

  return free
    .filter((slot) => slot.end > slot.start)
    .map((slot) => ({
      start: local(slot.start),
      end: local(slot.end),
      startISO: new Date(slot.start).toISOString(),
      endISO: new Date(slot.end).toISOString(),
      minutes: Math.round((slot.end - slot.start) / 60000),
    }));
}

/** The local wall clock, in the same shape the scripts emit. */
function local(ms) {
  const date = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return date.toISOString().slice(0, 19);
}

module.exports = { freeSlots };
