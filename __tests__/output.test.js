'use strict';

const fs = require('fs');

const output = require('../lib/output');

describe('lib/output formatting', () => {
  test('formatCalendars includes key fields', () => {
    const text = output.formatCalendars({
      calendars: [
        { name: 'Work', source: 'iCloud', id: 'CAL1', index: 0, writable: true },
        { name: 'ReadOnly', source: 'Local', id: 'CAL2', writable: false },
      ],
    });
    expect(text).toMatch(/Calendars:/);
    expect(text).toMatch(/Work/);
    expect(text).toMatch(/Source: iCloud/);
    expect(text).toMatch(/ID: CAL1/);
    expect(text).toMatch(/Index: 0/);
    expect(text).toMatch(/Writable: yes/);
    expect(text).toMatch(/Writable: no/);
  });

  test('formatEvents renders all-day and timed events', () => {
    const text = output.formatEvents({
      count: 2,
      truncated: false,
      events: [
        {
          id: 'E1',
          summary: 'All day thing',
          allDay: true,
          start: '2025-01-01T00:00:00Z',
          end: '2025-01-01T00:00:00Z',
          calendar: 'Work',
          isRecurring: false,
        },
        {
          id: 'E2',
          summary: 'Meeting',
          allDay: false,
          start: '2025-01-01T10:00:00.000Z',
          end: '2025-01-01T11:00:00.000Z',
          calendar: 'Work',
          isRecurring: true,
          location: 'Room 1',
          description: 'A'.repeat(120),
        },
      ],
    });

    expect(text).toMatch(/Events \(2\):/);
    expect(text).toMatch(/All day thing \(all-day\)/);
    expect(text).toMatch(/Date:/);
    expect(text).toMatch(/Meeting \[recurring\]/);
    expect(text).toMatch(/Start:/);
    expect(text).toMatch(/End:/);
    expect(text).toMatch(/Location: Room 1/);
    expect(text).toMatch(/Description: A+\.\.\./);
  });

  test('formatCreate renders alerts when present', () => {
    const text = output.formatCreate({
      ok: true,
      event: {
        id: 'E1',
        summary: 'Standup',
        allDay: false,
        start: '2025-01-15T09:00:00',
        end: '2025-01-15T09:30:00',
        calendar: 'Work',
        alerts: [5, 15],
      },
    });
    expect(text).toMatch(/Alerts:/);
    expect(text).toMatch(/5 min before/);
    expect(text).toMatch(/15 min before/);
  });

  test('formatCreate omits alerts line when no alerts', () => {
    const text = output.formatCreate({
      ok: true,
      event: {
        id: 'E1',
        summary: 'Standup',
        allDay: false,
        start: '2025-01-15T09:00:00',
        end: '2025-01-15T09:30:00',
        calendar: 'Work',
      },
    });
    expect(text).not.toMatch(/Alerts:/);
  });

  test('formatSearch renders results', () => {
    const text = output.formatSearch({
      count: 1,
      truncated: false,
      events: [
        {
          id: 'E10',
          summary: 'Standup',
          allDay: false,
          start: '2025-01-01T09:00:00',
          end: '2025-01-01T09:30:00',
          calendar: 'Work',
          calendarId: 'CAL1',
          isRecurring: false,
        },
      ],
    });
    expect(text).toMatch(/Search results \(1\):/);
    expect(text).toMatch(/Standup/);
    expect(text).toMatch(/Calendar: Work/);
  });

  test('formatSearch with no results', () => {
    const text = output.formatSearch({ count: 0, truncated: false, events: [] });
    expect(text).toMatch(/No search results found/);
  });

  test('formatExport renders grouped output', () => {
    const text = output.formatExport({
      totalEvents: 2,
      calendars: [
        {
          id: 'CAL1',
          name: 'Work',
          source: 'iCloud',
          events: [
            {
              id: 'E1',
              summary: 'Meeting',
              allDay: false,
              start: '2025-01-01T10:00:00',
              end: '2025-01-01T11:00:00',
              calendar: 'Work',
              isRecurring: false,
            },
            {
              id: 'E2',
              summary: 'Lunch',
              allDay: false,
              start: '2025-01-01T12:00:00',
              end: '2025-01-01T13:00:00',
              calendar: 'Work',
              isRecurring: false,
            },
          ],
        },
      ],
    });
    expect(text).toMatch(/Export \(2 total events\):/);
    expect(text).toMatch(/Calendar: Work/);
    expect(text).toMatch(/Meeting/);
    expect(text).toMatch(/Lunch/);
  });

  test('formatExport with no calendars', () => {
    const text = output.formatExport({ totalEvents: 0, calendars: [] });
    expect(text).toMatch(/No calendars found/);
  });

  // Output goes to the descriptor rather than through console, so that
  // process.exit cannot discard it; these assert on what is written there.
  function captured(fd, run) {
    const written = [];
    const spy = jest.spyOn(fs, 'writeSync').mockImplementation((to, data) => {
      if (to === fd) written.push(data.toString());
      return data.length;
    });
    try {
      run();
    } finally {
      spy.mockRestore();
    }
    return written.join('');
  }

  test('outputError prints NOT_AUTHORIZED tip in human mode', () => {
    const text = captured(2, () =>
      output.outputError({ code: 'NOT_AUTHORIZED', message: 'no' }, { json: false })
    );
    expect(text).toMatch(/Tip:/);
    expect(text).toMatch(/Error \[NOT_AUTHORIZED\]/);
  });

  test('an error in json mode goes to stdout, as the parseable answer', () => {
    const text = captured(1, () =>
      output.outputError({ code: 'NOT_AUTHORIZED', message: 'no' }, { json: true })
    );
    expect(JSON.parse(text)).toEqual({ ok: false, error: { code: 'NOT_AUTHORIZED', message: 'no' } });
  });

  test('output is written whole, however large, in one descriptor write', () => {
    // The bug this guards: console.log is async on a pipe and process.exit
    // dropped whatever had not flushed, cutting JSON at about 8KB.
    const big = { events: Array.from({ length: 500 }, (_, i) => ({ id: String(i), summary: 'x'.repeat(40) })) };
    const text = captured(1, () => output.output(big, { json: true }));
    expect(text.length).toBeGreaterThan(8192);
    expect(JSON.parse(text)).toEqual(big);
  });
});
