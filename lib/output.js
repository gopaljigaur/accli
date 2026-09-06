'use strict';

const fs = require('fs');

/**
 * Write a line to a file descriptor, synchronously.
 *
 * console.log is asynchronous when stdout is a pipe, and every command here
 * ends in process.exit(), which discards whatever has not flushed yet. A
 * consumer reading --json through a pipe therefore saw its output cut at the
 * pipe buffer, around 8KB: valid JSON became a truncated string. Writing to
 * the descriptor is synchronous, so the bytes are out before exit can happen.
 *
 * EAGAIN means the pipe is full and non-blocking, so the write is retried
 * rather than lost. EPIPE means the reader has gone (`| head`), which is not
 * an error worth crashing over.
 */
function writeLine(fd, text) {
  const data = Buffer.from(`${text}\n`, 'utf8');
  let written = 0;
  while (written < data.length) {
    try {
      written += fs.writeSync(fd, data, written);
    } catch (err) {
      if (err.code === 'EAGAIN') continue;
      if (err.code === 'EPIPE') return;
      throw err;
    }
  }
}

function writeOut(text) {
  writeLine(1, text);
}

function writeErr(text) {
  writeLine(2, text);
}

/**
 * Format a calendar for human-readable output
 */
function formatCalendar(calendar) {
  const indexPart = calendar.index !== undefined ? `, index ${calendar.index}` : '';
  return `${calendar.name} (${calendar.id}${indexPart})`;
}

/**
 * Format calendars list for human-readable output
 */
function formatCalendars(data) {
  if (!data.calendars || data.calendars.length === 0) {
    return 'No calendars found.';
  }
  const lines = ['Calendars:', ''];
  for (const cal of data.calendars) {
    lines.push(`  ${cal.name}`);
    if (cal.source) {
      lines.push(`    Source: ${cal.source}`);
    }
    lines.push(`    ID: ${cal.id}`);
    if (cal.index !== undefined) {
      lines.push(`    Index: ${cal.index}`);
    }
    if (typeof cal.writable === 'boolean') {
      lines.push(`    Writable: ${cal.writable ? 'yes' : 'no'}`);
    }
  }
  return lines.join('\n');
}

/**
 * Format a datetime for display
 */
function formatDateTime(dateStr, allDay) {
  if (!dateStr) return '';
  if (allDay) {
    // For all-day events, just show the date part
    return dateStr.split('T')[0];
  }
  // Show date and time
  return dateStr.replace('T', ' ');
}

/**
 * Format a single event for human-readable output
 */
function formatEvent(event, includeCalendar = false) {
  const lines = [];

  let header = event.summary || '(No title)';
  if (event.allDay) {
    header += ' (all-day)';
  }
  if (event.isRecurring) {
    header += ' [recurring]';
  }
  lines.push(header);

  if (includeCalendar && event.calendar) {
    lines.push(`  Calendar: ${event.calendar}`);
  }

  const startStr = formatDateTime(event.start, event.allDay);
  const endStr = formatDateTime(event.end, event.allDay);

  if (event.allDay) {
    if (startStr === endStr) {
      lines.push(`  Date: ${startStr}`);
    } else {
      lines.push(`  Dates: ${startStr} to ${endStr}`);
    }
  } else {
    lines.push(`  Start: ${startStr}`);
    lines.push(`  End: ${endStr}`);
  }

  if (event.location) {
    lines.push(`  Location: ${event.location}`);
  }

  if (event.description) {
    const desc = event.description.length > 100
      ? event.description.substring(0, 100) + '...'
      : event.description;
    lines.push(`  Description: ${desc}`);
  }

  if (event.alerts && event.alerts.length > 0) {
    lines.push(`  Alerts: ${event.alerts.map(m => `${m} min before`).join(', ')}`);
  }

  lines.push(`  ID: ${event.id}`);

  return lines.join('\n');
}

/**
 * Format events list for human-readable output
 */
function formatEvents(data) {
  if (!data.events || data.events.length === 0) {
    return 'No events found.';
  }

  const lines = [];
  if (data.truncated) {
    lines.push(`Events (showing ${data.events.length}, truncated):`);
  } else {
    lines.push(`Events (${data.count}):`);
  }
  lines.push('');

  for (const event of data.events) {
    lines.push(formatEvent(event, true));
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format a single event detail for human-readable output
 */
function formatEventDetail(data) {
  if (!data.event) {
    return 'Event not found.';
  }
  return formatEvent(data.event, true);
}

/**
 * Format setup result for human-readable output
 */
function formatSetup(data) {
  if (data.ok) {
    const lines = [data.message];
    if (data.calendars && data.calendars.length > 0) {
      lines.push(`Found ${data.calendars.length} calendar(s): ${data.calendars.join(', ')}`);
    }
    return lines.join('\n');
  }
  return 'Setup failed.';
}

/**
 * Format create result for human-readable output
 */
function formatCreate(data) {
  if (data.ok && data.event) {
    const lines = ['Event created successfully:', ''];
    lines.push(formatEvent(data.event, true));
    return lines.join('\n');
  }
  return 'Failed to create event.';
}

/**
 * Format update result for human-readable output
 */
function formatUpdate(data) {
  if (data.ok && data.event) {
    const lines = ['Event updated successfully:', ''];
    lines.push(formatEvent(data.event, true));
    if (data.warning) {
      lines.push('');
      lines.push(`Warning: ${data.warning}`);
    }
    return lines.join('\n');
  }
  return 'Failed to update event.';
}

/**
 * Format delete result for human-readable output
 */
function formatDelete(data) {
  if (data.ok && data.deleted) {
    const lines = [`Event deleted from calendar "${data.deleted.calendar}".`];
    if (data.warning) {
      lines.push(`Warning: ${data.warning}`);
    }
    return lines.join('\n');
  }
  return 'Failed to delete event.';
}

/**
 * Format freebusy result for human-readable output
 */
function formatFreeBusy(data) {
  const lines = [];

  if (data.calendarsNotFound && data.calendarsNotFound.length > 0) {
    lines.push(`Calendars not found: ${data.calendarsNotFound.join(', ')}`);
    lines.push('');
  }

  if (!data.busy || data.busy.length === 0) {
    lines.push('No busy time slots found.');
    return lines.join('\n');
  }

  lines.push(`Busy time slots (${data.busy.length}):`);
  lines.push('');

  for (const slot of data.busy) {
    const startStr = formatDateTime(slot.start, false);
    const endStr = formatDateTime(slot.end, false);
    lines.push(`  ${startStr} - ${endStr}`);
    lines.push(`    ${slot.summary || '(No title)'} [${slot.calendar}]`);
  }

  return lines.join('\n');
}

/**
 * Format dry-run delete result for human-readable output
 */
function formatDryRunDelete(data) {
  if (data.dryRun && data.wouldDelete) {
    const ev = data.wouldDelete;
    const lines = ['Dry run: would delete event'];
    lines.push(`  Summary: ${ev.summary || '(No title)'}`);
    lines.push(`  Calendar: ${ev.calendar}`);
    lines.push(`  Start: ${ev.start}`);
    lines.push(`  End: ${ev.end}`);
    lines.push(`  ID: ${ev.id}`);
    return lines.join('\n');
  }
  return 'Dry run: no event found.';
}

/**
 * Format dry-run update result for human-readable output
 */
function formatDryRunUpdate(data) {
  if (data.dryRun && data.wouldUpdate) {
    const { eventId, changes } = data.wouldUpdate;
    const lines = [`Dry run: would update event ${eventId}`];
    for (const key of Object.keys(changes)) {
      lines.push(`  ${key}: ${JSON.stringify(changes[key])}`);
    }
    return lines.join('\n');
  }
  return 'Dry run: nothing to update.';
}

/**
 * Format search results for human-readable output
 */
function formatSearch(data) {
  if (!data.events || data.events.length === 0) {
    return 'No search results found.';
  }

  const lines = [];
  if (data.truncated) {
    lines.push(`Search results (showing ${data.events.length}, truncated):`);
  } else {
    lines.push(`Search results (${data.count}):`);
  }
  lines.push('');

  for (const event of data.events) {
    lines.push(formatEvent(event, true));
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format export results for human-readable output
 */
function formatExport(data) {
  const lines = [];

  if (!data.calendars || data.calendars.length === 0) {
    return 'No calendars found.';
  }

  lines.push(`Export (${data.totalEvents} total events):`);
  lines.push('');

  for (const cal of data.calendars) {
    lines.push(`Calendar: ${cal.name} (${cal.id})`);
    if (cal.source) {
      lines.push(`  Source: ${cal.source}`);
    }
    lines.push(`  Events: ${cal.events.length}`);
    if (cal.events.length > 0) {
      lines.push('');
      for (const event of cal.events) {
        const indented = formatEvent(event, false).split('\n').map((l) => '  ' + l).join('\n');
        lines.push(indented);
        lines.push('');
      }
    } else {
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format an error for human-readable output
 */
function formatError(error) {
  return `Error [${error.code}]: ${error.message}`;
}

/**
 * Output result - handles both JSON and human-readable formats
 */
function output(data, options = {}) {
  const { json = false, formatter = null } = options;

  if (json) {
    writeOut(JSON.stringify(data, null, 2));
  } else if (formatter) {
    writeOut(formatter(data));
  } else {
    writeOut(JSON.stringify(data, null, 2));
  }
}

/**
 * Output error - handles both JSON and human-readable formats
 */
function outputError(error, options = {}) {
  const { json = false } = options;

  if (json) {
    writeOut(JSON.stringify({ ok: false, error }, null, 2));
  } else {
    writeErr(formatError(error));
    if (error && error.code === 'NOT_AUTHORIZED') {
      writeErr(
        'Tip: On recent macOS versions this can be set to "Add Only". In System Settings > Privacy & Security > Calendars, click Options… and set "Full Access" for your terminal and/or "osascript".'
      );
    }
  }
}

module.exports = {
  writeOut,
  writeErr,
  formatCalendars,
  formatEvents,
  formatEventDetail,
  formatSetup,
  formatCreate,
  formatUpdate,
  formatDelete,
  formatFreeBusy,
  formatDryRunDelete,
  formatDryRunUpdate,
  formatSearch,
  formatExport,
  formatError,
  output,
  outputError,
};
