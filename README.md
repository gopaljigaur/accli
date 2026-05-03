# accli

Apple Calendar CLI for macOS — manage calendars and events from the command line (via JXA + EventKit).

> Forked from [joargp/accli](https://github.com/joargp/accli).

## Install

```bash
npm i -g @gopaljigaur/accli
```

## Quick start

```bash
accli setup
accli calendars
accli events --calendar-name "Work" --from 2025-01-01 --to 2025-01-31
```

## Permissions (macOS)

On first run, you may need to grant Calendar access.

1. Run `accli setup`
2. In **System Settings → Privacy & Security → Calendars**, ensure the responsible app (often `osascript` and/or your terminal) has **Full Access** (not “Add Only”).

## Commands

- `setup` — trigger macOS Calendar permission prompt
- `calendars` — list calendars
- `events` — list events in a range
- `event` — fetch a single event by ID
- `create` — create an event (supports `--alert <minutes>`, repeatable)
- `update` — update an event (supports `--alert <minutes>`, replaces all existing alerts)
- `delete` — delete an event
- `freebusy` — show busy time slots
- `config` — set/show/clear default calendar

Run `accli <command> --help` for command-specific options.

## Alerts

Set one or more alerts on create or update using `--alert <minutes>` (minutes before event start). Repeatable.

```bash
accli create Home --summary "Standup" --start 2025-01-15T09:00 --end 2025-01-15T09:30 --alert 5 --alert 15
accli update Home <event-id> --alert 5 --alert 10
```

`--alert` on update replaces all existing alerts. Omit to leave alerts unchanged.

> Note: iCloud calendars preserve multiple alerts. Google Calendar via CalDAV syncs only one.

## JSON output

Add `--json` to most commands to output JSON (including errors).

## Agent-Ready

Designed for coding agents and automation: structured `--json` output on all commands, distinct exit codes (0=success, 1=runtime, 2=validation, 10=auth), machine-readable error codes, and persistent calendar IDs for reliable targeting.

## Notes

- macOS only (`darwin`), because it uses `osascript` + EventKit.
- Config path defaults to `~/.acclirc` but can be overridden via `ACCLI_CONFIG_PATH` (or `ACCLI_HOME`).
