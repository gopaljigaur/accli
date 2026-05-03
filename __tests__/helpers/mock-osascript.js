'use strict';

const childProcess = require('child_process');
const { EventEmitter } = require('events');

const realSpawn = childProcess.spawn;

function respondForWrappedScript(wrappedScript) {
  if (wrappedScript.includes('calendars.jxa')) {
    return { ok: true, calendars: [{ name: 'Work', source: 'iCloud', id: 'CAL1', index: 0, writable: true }] };
  }
  if (wrappedScript.includes('setup.jxa')) {
    return { ok: true, message: 'ok', calendars: ['Work'] };
  }
  if (wrappedScript.includes('events.jxa')) {
    return { ok: true, count: 0, truncated: false, events: [] };
  }
  if (wrappedScript.includes('event.jxa')) {
    if (wrappedScript.includes('"eventId":"some-event-id"') || wrappedScript.includes('"eventId": "some-event-id"')) {
      return { event: { id: 'some-event-id', calendar: 'Work', calendarId: 'CAL1', summary: 'Stub Event', start: '2025-01-15T10:00:00', end: '2025-01-15T11:00:00', allDay: false, isRecurring: false, alerts: [] } };
    }
    return { ok: false, error: { code: 'EVENT_NOT_FOUND', message: 'missing' } };
  }
  if (wrappedScript.includes('search.jxa')) {
    return { ok: true, count: 0, truncated: false, events: [] };
  }
  if (wrappedScript.includes('export.jxa')) {
    return { ok: true, calendars: [], totalEvents: 0 };
  }
  if (wrappedScript.includes('freebusy.jxa')) {
    return { ok: true, busy: [] };
  }
  return { ok: true };
}

childProcess.spawn = function patchedSpawn(command, args, options) {
  if (command !== 'osascript') return realSpawn(command, args, options);

  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();

  const wrappedScript = Array.isArray(args) ? args[3] : '';
  const payload = respondForWrappedScript(String(wrappedScript || ''));

  process.nextTick(() => {
    proc.stdout.emit('data', Buffer.from(JSON.stringify(payload)));
    proc.emit('close', 0);
  });

  return proc;
};

