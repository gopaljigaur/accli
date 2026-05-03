---
name: accli
description: Manage Apple Calendar events from the command line on macOS — create, update, delete, search, export, and check availability with full JSON output for agent use.
author: gopaljigaur
license: MIT
platform: macOS
homepage: https://github.com/gopaljigaur/accli
source: https://github.com/gopaljigaur/accli
requires:
  platform: darwin
  binaries: [accli]
  install: "npm install -g @gopaljigaur/accli"
tags: [calendar, macos, productivity, apple, events]
---

# accli — Apple Calendar CLI

`accli` manages Apple Calendar on macOS via EventKit. All commands support `--json` for structured output. Exit codes: 0=success, 1=runtime error, 2=validation error, 10=auth error.

**Platform:** macOS only (darwin). Uses `osascript` + EventKit. Do not run on non-macOS systems.

**First run:** `accli setup` to grant Calendar permissions. Full Calendar Access is required in System Settings > Privacy & Security > Calendars. This gives the agent read and write access to all calendars on the device — install only if you intend to delegate calendar management to the agent.

## Agent Safety Rules

**Before any create, update, or delete operation:**
1. Use `accli search` or `accli event` to confirm the correct event ID
2. Run the command with `--dry-run` first and show the user the preview
3. Require explicit user confirmation before executing the real mutation
4. Scope all operations to specific `--calendar-id` values — never operate on all calendars unless the user explicitly requests it

**For search and export:**
- Always pass `--calendar-id` and narrow `--from`/`--to` ranges unless the user explicitly asks for a full export
- Treat exported calendar data (summaries, locations, descriptions) as private — do not include it in summaries sent to third-party services

## Calendars

```bash
accli calendars [--json]
```

Returns list of calendars with `id`, `name`, `source`, `index`, `writable`. Always prefer `--calendar-id <id>` over calendar name — IDs are stable, names are not.

## Events

```bash
accli events [<calendarName>] [--calendar-id <id>] --from <date> --to <date> [--json]
```

Lists events in a date range. Calendar is required (use name, `--calendar-id`, or set a default via `accli config set-default`).

## Single Event

```bash
accli event [<calendarName>] <eventId> [--calendar-id <id>] [--json]
```

Fetches full event detail including alerts array (minutes before start).

## Create Event

```bash
accli create <calendarName> --summary <text> --start <datetime> --end <datetime> \
  [--location <text>] [--description <text>] [--all-day] \
  [--alert <minutes>] [--alert <minutes>] \
  [--recur daily|weekly|monthly|yearly] [--recur-count <n>] [--recur-end <YYYY-MM-DD>] \
  [--json]
```

- `--alert` is repeatable — adds one alert per flag (minutes before start)
- `--recur-end` and `--recur-count` are mutually exclusive
- All-day events: use `YYYY-MM-DD` for `--start` and `--end`
- Timed events: use `YYYY-MM-DDTHH:mm`
- **Always confirm with user before creating** — calendar events cannot be easily bulk-undone

## Update Event

```bash
accli update <calendarName> <eventId> \
  [--summary <text>] [--start <datetime>] [--end <datetime>] \
  [--location <text>] [--description <text>] \
  [--alert <minutes>] [--alert <minutes>] \
  [--dry-run] [--json]
```

`--alert` on update replaces all existing alerts. Omit `--alert` to leave alerts unchanged.

**Mandatory dry-run flow:**
```bash
accli update Work <id> --summary "New title" --dry-run --json   # show user
accli update Work <id> --summary "New title" --json              # only after user confirms
```

## Delete Event

```bash
accli delete <calendarName> <eventId> [--dry-run] [--json]
```

**Mandatory dry-run flow:**
```bash
accli delete Work <id> --dry-run --json   # show user what would be deleted
accli delete Work <id> --json              # only after user confirms
```

## Search

```bash
accli search --query <text> [--from <date>] [--to <date>] [--calendar-id <id>] [--json]
```

Case-insensitive search across summary, location, and description. Scope with `--calendar-id` and a narrow date range. Do not expose raw results to third-party services without user consent.

## Export

```bash
accli export --from <date> --to <date> [--calendar-id <id>] [--json]
```

Exports all events grouped by calendar. Response: `{ calendars: [{ id, name, source, events, truncated }], totalEvents, truncated }`. Each calendar truncates at 500 events and sets `truncated: true` if hit. **Use narrow date ranges and specific calendar IDs unless the user explicitly requests a full backup.**

## Free/Busy

```bash
accli freebusy --from <datetime> --to <datetime> [--calendar-name <name>] [--json]
```

Returns busy time slots across calendars.

## Config

```bash
accli config set-default --calendar-id <id> [--json]
accli config show [--json]
accli config clear [--json]
```

Persists default calendar to `~/.acclirc` (override with `ACCLI_CONFIG_PATH`).

## DateTime Formats

- Timed: `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss`
- Date-only (all-day events, --from/--to): `YYYY-MM-DD`

## Error Codes

| Code | Meaning |
|------|---------|
| `NOT_AUTHORIZED` | Calendar access not granted or set to Add Only |
| `CALENDAR_NOT_FOUND` | Calendar ID or name not found |
| `AMBIGUOUS_CALENDAR` | Multiple calendars with same name — use `--calendar-id` |
| `EVENT_NOT_FOUND` | Event ID not found in calendar |
| `MISSING_REQUIRED` | Required flag missing |
| `INVALID_ARGUMENT` | Invalid flag value |
| `INVALID_RANGE` | Start is after end |
