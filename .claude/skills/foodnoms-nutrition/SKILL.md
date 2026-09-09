---
name: foodnoms-nutrition
description: Add FoodNoms nutrition to a logged Plate & Shoot meal. Reads the meal's Outlook calendar event and its photo through the Graph proxy, produces a `.foodnoms` import file, and attaches it back to the event. Use when a routine fires with a meal event id in its prompt, or to sweep recent food events for ones still missing a `.foodnoms`.
---

# FoodNoms nutrition for a logged meal

Plate & Shoot logs each meal as an Outlook calendar event: the **subject** is the dish,
the **body** is a markdown breakdown (before/after/consumed grams + ingredients), and a
weighed **photo** is attached. This skill turns that into a `.foodnoms` file FoodNoms can
import, and attaches the file back onto the same event so the iOS app can offer "Open in
FoodNoms".

There is **no server-side state**: every run rediscovers what to do from the calendar
itself. The presence of a `*.foodnoms` attachment on an event is the "already done" marker.

## Inputs

- **Target event id** — supplied in the invoking prompt (it arrives via the routine
  fire's `text` field). If a single event id is given, process only that one.
- **No event id given** (the hourly backstop fire) — sweep recent events and process every
  food-log event that lacks a `.foodnoms` (see Idempotency).

## Secrets: the Graph proxy URL and key

All Microsoft Graph access goes through the Power Automate proxy (delegated Graph, no app
registration). Two credentials, both read from the environment — never hardcode or echo
either:

- **`GRAPH_PROXY_URL`** — the endpoint, including its `?sig=` signature.
- **`GRAPH_PROXY_KEY`** — the shared secret sent as the `x-proxy-key` header; the proxy
  returns **401** without it.

```sh
: "${GRAPH_PROXY_URL:?set GRAPH_PROXY_URL to the Power Automate proxy endpoint}"
: "${GRAPH_PROXY_KEY:?set GRAPH_PROXY_KEY to the x-proxy-key shared secret}"
```

### Proxy call contract

`POST $GRAPH_PROXY_URL` with a JSON body `{ "method", "uri", "body" }`. The reply is the
Graph response wrapped as `{ statusCode, headers, body }`.

- `uri` must be an **absolute** Graph URL: `https://graph.microsoft.com/v1.0/...`. Relative
  paths (`me/events`) are rejected by the connector.
- Event ids contain `=`/`+`/`/`, so **URL-encode the id** into the path.
- `body` must be a real JSON object (not a stringified one); use `null` for GET/DELETE.
- Read Graph's payload from `.body`; check success with `.statusCode` (200/201/204).

A helper you can reuse each step:

```sh
graph() {  # graph METHOD ABSOLUTE_URI [JSON_BODY]
  jq -nc --arg m "$1" --arg u "$2" --argjson b "${3:-null}" \
     '{method:$m, uri:$u, body:$b}' \
  | curl -s -m 120 -X POST "$GRAPH_PROXY_URL" \
      -H 'Content-Type: application/json' \
      -H "x-proxy-key: $GRAPH_PROXY_KEY" --data @-
}
enc() { jq -rn --arg x "$1" '$x|@uri'; }   # URL-encode an id for the path
```

## Procedure

### 1. Resolve the target event(s)

- **Given an id:** `EV=<id>`.
- **Sweep:** query the **"Food" calendar specifically**, newest first, and keep the
  food-log ones:
  ```sh
  # resolve the Food calendar's id once (it doesn't change run to run, but don't hardcode
  # it in this file — a personal calendar id has no business living in a shared repo)
  FOOD_CAL=$(graph GET "https://graph.microsoft.com/v1.0/me/calendars?\$filter=name%20eq%20'Food'&\$select=id" \
    | jq -r '.body.value[0].id')
  graph GET "https://graph.microsoft.com/v1.0/me/calendars/$(enc "$FOOD_CAL")/events?\$top=25&\$orderby=start/dateTime%20desc&\$select=id,subject,body,hasAttachments"
  ```
  > ⚠ **Don't sweep `/me/events` (the default/merged view) sorted by `start/dateTime desc`.**
  > That ordering surfaces the *furthest-future* events first — a meeting scheduled next
  > week outranks a meal logged an hour ago — so the sweep silently finds nothing whenever
  > anything else is on the calendar further out than the last meal, which on a normal
  > calendar is always. Verified live (2026-09-09): a 25-event sweep of `/me/events` found
  > zero food logs, all displaced by school/work meetings; the same query against the
  > **Food** calendar's own event list found all of them. Every event in that calendar is a
  > meal by construction, so ordering by `start/dateTime desc` there is exactly "most
  > recently eaten first" — no further filter needed.
  A food-log event is additionally identified by its body containing the weight signature
  **`- Consumed ::`** (Plate & Shoot's notes format) — kept as a second guard even within
  the Food calendar, since a handful of old untagged entries (e.g. bare "Cheese", "Olives"
  reminders from 2018) live there too without it.
  **Skip any event whose `Consumed ::` gram figure is `0` (or `0.0`)** — before equals
  after, so nothing was actually eaten; there is no nutrition to attach. Report it as
  skipped ("0 g consumed"), not as an error.

### 2. List the event's attachments (idempotency check)

```sh
graph GET "https://graph.microsoft.com/v1.0/me/events/$(enc "$EV")/attachments?\$select=id,name,contentType"
```

- If any attachment `name` ends in `.foodnoms` (case-insensitive) → **already done, skip
  this event.** Never produce a second one.
- Otherwise find the **image** attachment (name ends `.jpg`/`.jpeg`/`.png`, or
  `contentType` starts `image/`). Keep its `id`.

### 3. Read the meal

- Fetch the image bytes and decode:
  ```sh
  graph GET "https://graph.microsoft.com/v1.0/me/events/$(enc "$EV")/attachments/$(enc "$IMG_ID")" \
    | jq -r '.body.contentBytes' | base64 -d > /tmp/meal.jpg
  ```
- Read the event `subject` (the dish name) and `body` (the markdown breakdown: before/after/
  consumed grams and the ingredient lines). The photo's EXIF UserComment also carries
  `before_g`/`after_g`/`consumed_g`.

### 4. Produce the `.foodnoms` file

Analyze the dish from the photo + the notes breakdown and generate the `.foodnoms` import
file for this meal — the food(s), their portions/grams, and nutrition — in FoodNoms's own
import format. Write the content to `/tmp/meal.foodnoms`.

### 5. Attach it back to the event

Name the file after the dish (sanitize the subject; fall back to `meal`):

```sh
NAME="$(printf '%s' "$SUBJECT" | tr -c 'A-Za-z0-9 ._-' '_' )"; [ -n "$NAME" ] || NAME=meal
CB="$(base64 < /tmp/meal.foodnoms | tr -d '\n')"
graph POST "https://graph.microsoft.com/v1.0/me/events/$(enc "$EV")/attachments" \
  "$(jq -nc --arg n "$NAME.foodnoms" --arg cb "$CB" \
      '{"@odata.type":"#microsoft.graph.fileAttachment", name:$n, contentType:"application/octet-stream", contentBytes:$cb}')"
```

Expect `statusCode: 201`. Base64-encode the text **once**.

### 6. Report

State, per event: dish name, whether it was skipped (already had a `.foodnoms`) or newly
attached, and the file name. On the sweep, summarize counts.

## Guardrails

- **Never overwrite / duplicate.** If a `.foodnoms` already exists, stop — the idempotency
  check in step 2 is the whole safety model.
- **Only food-log events.** Require the `- Consumed ::` signature before touching anything;
  never attach to an unrelated event.
- **Absolute Graph URLs only**, ids URL-encoded, `body` a real object — see the contract.
- **Never print or log `GRAPH_PROXY_URL` or `GRAPH_PROXY_KEY`**; they are the credentials.
- If a step fails (non-2xx `.statusCode`), report the `.body.error` and stop for that event;
  do not paper over it — the next fire (or the hourly backstop) retries cleanly because the
  event still has no `.foodnoms`.

## Routine setup

This skill is driven by a Claude Code **routine** (a scheduled cloud agent). For it to be
available, this skill directory must be committed to the repo the routine builds from,
and the routine configured as follows.

- **Location in the repo:** `.claude/skills/foodnoms-nutrition/` at the repo root
  (just `SKILL.md`). Cloud routines get a fresh clone each run,
  so it must be committed — a personal `~/.claude/skills/` copy is *not* seen in the cloud.
- **Secrets (routine environment variables):**
  - `GRAPH_PROXY_URL` — the Power Automate proxy endpoint (includes `?sig=`).
  - `GRAPH_PROXY_KEY` — the `x-proxy-key` shared secret.
- **Routine saved prompt:**
  > Invoke the **foodnoms-nutrition** skill. If the message contains a meal event id,
  > process only that event; otherwise sweep recent food-log events for any missing a
  > `.foodnoms`.
- **On-demand fire** (from the iOS app, the moment a meal is logged — this is the fast
  path, since the schedule floor is 1 hour): pass the event id in the fire's `text`, e.g.
  `Run foodnoms-nutrition for event AAMkAD…AAA=`.
- **Backstop schedule:** fire the same routine **hourly** (the minimum interval) with no
  id, so the sweep catches anything the on-demand fire missed. The idempotency check makes
  this safe to re-run.
