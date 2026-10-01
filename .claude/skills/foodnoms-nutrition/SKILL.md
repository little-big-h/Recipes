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
  graph GET "https://graph.microsoft.com/v1.0/me/calendars/$(enc "$FOOD_CAL")/events?\$top=25&\$orderby=start/dateTime%20desc&\$select=id,subject,body,start,hasAttachments"
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
- Capture the event's **`start.dateTime`** as `START` (it is in the sweep's `$select`; for
  the id path, `graph GET ".../events/$(enc "$EV")?\$select=start"`). Step 5 encodes it into
  the file name so the "Log to FoodNoms" Shortcut can log at the meal's real time — the
  `.foodnoms` format itself stores no date.

### 4. Produce the `.foodnoms` file

Analyze the dish from the photo + the notes breakdown and estimate its nutrition, then
build the file — **through `node tools/js/cli.js build`, never hand-rolled JSON**
(`CLAUDE.md` hard rule: "`.foodnoms` files are generated by `tools/js`, always"; this
applies to every run, routine-fired ones included). Write a recipe JSON with
`"foodnoms": {"collectionType": 2}`, one ingredient with a `nutrients` block (per 100g
— see `tools/js/README.md`'s "Recipe input" section) and an `"uncertainty"` per the
policy below, `grams` = the event's consumed figure, then run `cli.js build` on it.

**Before estimating from scratch, check `docs/MEAL_LOG_PRODUCTS.md`** — a named,
repeatably-bought bakery/packaged product may already have a per-100g estimate there;
reuse it rather than re-deriving.

**If the dish is a build-your-own bowl from a vendor with its own reference doc
(currently: Supergreen, `docs/SUPERGREEN_MENU.md`), decompose it — don't fall back to a
single top-down guess for the whole bowl.** The tell is the body listing a base plus
several named toppings/protein/dressing (e.g. "Salad & Soba base; Wakame, Purple Cabbage
and Kimchi as cold toppings; Baked Broccoli, Roasted Pumpkin and Chickpeas as hot
toppings") rather than one dish name. When that's the shape:

1. Match each named component (subject + body) against that vendor's reference doc —
   base(s), cold/hot toppings, protein, dressing tables all give per-100g figures already
   reconciled to that vendor's own published calories/protein (see that doc's own
   methodology section).
2. Weight each matched component by the vendor's own published default serving grams
   (same doc) — unless the event body gives real per-component weights, in which case use
   those instead. **These menu-default grams are a ratio input only** — they fix each
   component's *relative* share of the bowl (and the bowl's implied caloric density), not
   what was actually eaten. Never use them as the logged weight.
3. Sum each component's absolute nutrients (per-100g figure × weight ÷ 100), then divide
   the total by the summed component weight to get the bowl's blended per-100g figure.
   This per-100g figure is what actually matters and is scale-invariant — it comes out the
   same whether the menu-default weights summed to 500g or 5g. The ingredient entry's own
   `grams` (step 4, general instruction) is always the event's **real weighed consumed
   total**, never the menu-serving sum.
4. **Carry the full nutrient set through** — calories, protein, carbs, sugars, fat, fibre,
   sodium, iron, calcium, magnesium, potassium, zinc, vitaminD, vitaminB12, folate.
   Truncating a documented, sodium/micro-complete source down to just
   calories/protein/carbs/fat/fiber throws away real data for no reason — a component like
   kimchi or a seaweed topping carries meaningful sodium that a generic estimate would
   never surface.
5. If a dressing is logged as its own separate event/entry rather than mixed into the
   bowl, look it up the same way, on its own — that's still a single-component case (a
   dressing name matches one reference-doc row directly), the same as any other named
   product in `MEAL_LOG_PRODUCTS.md`.

A signature/named bowl (matches one whole row in the vendor's own "signature bowls"
table, e.g. "Grilled Salmon Bowl") is the single-component case — just use that row's
per-100g figures directly, no decomposition needed.

For anything not covered by a vendor reference doc or `MEAL_LOG_PRODUCTS.md`, estimate
per `docs/MEAL_LOGGING.md`'s "top-down, bottom-up, take the midpoint" method — this
session runs with **no conversation history**, so that file's full methodology is the
only version of it available; don't shortcut to a single guess.

### 5. Attach it back to the event

Name the file `<dish>__<epoch>.foodnoms` — the dish for a human label, and the meal's epoch
(from `START`) so the "Log to FoodNoms" Shortcut can set the time. `_` is stripped from the
dish because `__` delimits the fields the Shortcut parses (epoch is the last one); the app
matches any `*.foodnoms` by suffix, so the epoch is invisible to it.

```sh
EPOCH=$(date -u -d "${START:0:19}Z" +%s)                 # START = start.dateTime (UTC); absolute instant
DISH="$(printf '%s' "$SUBJECT" | tr -c 'A-Za-z0-9 .-' '-')"; [ -n "$DISH" ] || DISH=meal
CB="$(base64 < /tmp/meal.foodnoms | tr -d '\n')"
graph POST "https://graph.microsoft.com/v1.0/me/events/$(enc "$EV")/attachments" \
  "$(jq -nc --arg n "${DISH}__${EPOCH}.foodnoms" --arg cb "$CB" \
      '{"@odata.type":"#microsoft.graph.fileAttachment", name:$n, contentType:"application/octet-stream", contentBytes:$cb}')"
```

Expect `statusCode: 201`. Base64-encode the text **once**. (`date -u -d` is GNU date — fine
in the Linux cloud sandbox.)

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
