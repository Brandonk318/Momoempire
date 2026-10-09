# Merge order and conflict guide (EMP-WL-063)

Applies to the open PRs that target `Cloudflare-2` (base `0256358`). This file only covers
merge order and hand-resolved conflicts. It makes no product decisions. Brann decides what
gets merged, and when.

Checked on 2026-10-08 by merging the whole stack locally in this order (not pushed, not
deployed). Only four merges conflicted (#18, #13, #16, #19), and the five resolutions in
section 3 cover them. With those applied (and #26–#32 added as listed in section 1), the
backend unit suites passed (320, against a throwaway local MongoDB), the frontend suites passed
(185), and both builds succeeded. The legacy `test_phase*.py`,
`backend_test.py`, `test_call_to_payment.py` and `test_iteration10_*.py` files need a live
server, so they were not part of that run.

## 1. Waitlist launch stack: merge in this order

| Step | PR | Branch | Notes |
|---|---|---|---|
| 1 | #10 | fix/cors-enforce-and-health-leaks | |
| 2 | #8 | fix/admin-password-first-login | |
| 2a | #25 | fix/admin-reset-followups | stacked on #8, merge right after #8 |
| 3 | #11 | fix/waitlist-endpoint-hardening | adds honeypot + Turnstile (see section 4) |
| 4 | #12 | feat/instant-quote-estimator | |
| 5 | #14 | fix/waitlist-followups | |
| 6 | #18 | fix/waitlist-db-errors | **conflict with #10 in `backend/server.py`** (section 3, resolution 1) |
| 7 | #15 | fix/waitlist-confirmation-off | stacked on #14 |
| 8 | #13 | feat/waitlist-only-mode | conflicts in `backend/.env.example` and `Landing.jsx` imports (resolutions 2, 3) |
| 9 | #22 | fix/waitlist-legal-trial-text | after #13 |

After #13, three chains. Each chain has to stay in its own order, but the chains can go in any
order relative to each other:

- **#17, then #24**
- **#16, then #19, then #23**. #16 and #19 conflict in `Landing.jsx` (resolutions 4, 5)
- **#20**, any time after #13

**#21** (waitlist data ops: script + docs) can be merged any time. It touches no files the
others touch.

Follow-up PRs opened after #25. Each one merges right after the PR it is stacked on, and
none of them needs hand resolution (each merges cleanly onto the full stack):

| PR | Stacked on | Merge right after | What |
|---|---|---|---|
| #26 | Cloudflare-2 | any time | this guide (docs only) |
| #27 | #18 | #18 | WL-061 fail fast on a down DB, WL-044 legacy test URLs |
| #28 | #23 | #23 | WL-064/071 landing form error text |
| #29 | #12 | #12 | WL-071/064 estimator error text (same `waitlistErrors.js` as #28, byte-identical) |
| #30 | #22 | #22 | WL-082 fixed "Last updated" date |
| #31 | #20 | #20 | WL-072 canonical + favicon.ico, WL-073 no source maps in the waitlist build |
| #32 | #21 | #21 | WL-074/075 data-ops credentials + typed DELETE confirmation |

Full order as checked locally: #10, #8, #25, #11, #12, #29, #14, #18, #27, #15, #13, #22,
#30, #17, #24, #16, #19, #23, #28, #20, #31, #21, #32, #26.

## 2. PRs outside the waitlist stack (#1–#7, #9)

None of these is needed for the waitlist launch. Hold them until the stack above is merged,
then merge them in any order, except where the notes below say otherwise. Conflicts listed are
against the fully merged stack (`git merge-tree`, 2026-10-08):

| PR | Branch | Conflicts with the merged stack | How to resolve |
|---|---|---|---|
| #1 | feat/emp-dev-002-stripe-checkout | `frontend/src/pages/Pricing.jsx` (from #12/#14) | keep both changes by hand; check that the estimator link from #12 is still there |
| #2 | landing-es | `frontend/src/pages/Landing.jsx` | same rule as #4: keep the honeypot + Turnstile (section 4) |
| #3 | knowledge-embeddings | none | |
| #4 | webrtc-voice-demo | `backend/.env.example`, `backend/routers/marketing.py`, `frontend/src/pages/Landing.jsx` | **section 4 applies**. Keep both sides in `.env.example`. In `marketing.py` keep the stack's waitlist handler unchanged |
| #5 | docs linode-runbook | none | |
| #6 | docs adhd-portal-spec | none | |
| #7 | stripe-webhook-signature | none | |
| #9 | fix/customer-links-real-pages | none | not in Watcher's QC list. Brann to decide whether/when |

Rule of thumb for #4: merge it **last**. It conflicts with #11, #13, #14 and the Landing
chain, so resolving it once against the finished stack is the least work.

## 3. Watcher's five hand resolutions

### Resolution 1: #18 vs #10, `backend/server.py` (health endpoint)

> **NEVER "keep both sides" here.** Keeping both duplicates the `return`/`except` lines,
> which makes the file a syntax error or makes the index check unreachable. Replace the whole
> conflict block with exactly this:

```python
        await db.command("ping")
        from routers.marketing import waitlist_index_healthy  # EMP-WL-040: no unique email index
        if not waitlist_index_healthy():
            return {"status": "degraded"}
        return {"status": "ok"}
    except Exception:
        logging.getLogger("aio").exception("health: database ping failed")
        return {"status": "degraded", "detail": "service unavailable"}
```

Check: `python -c "import ast;ast.parse(open('backend/server.py').read())"`, and `GET /api/health`
returns no exception text.

### Resolution 2: #13, `backend/.env.example`

Keep both sides. Every variable name from both branches stays (names only, no values).

### Resolution 3: #13, `frontend/src/pages/Landing.jsx` imports

Keep both sides. Every import from both branches stays. Remove exact duplicate lines only.

### Resolution 4: #16, `frontend/src/pages/Landing.jsx`

- React import becomes: `import { useCallback, useEffect, useRef, useState } from "react";`
- In the form: keep #11's honeypot block and `<TurnstileWidget onToken={onTurnstileToken} />`,
  **then** #16's submit button.

### Resolution 5: #19, `frontend/src/pages/Landing.jsx`

- Take #19's labelled fields and its `wlError` alert.
- Put #11's honeypot block and `<TurnstileWidget onToken={onTurnstileToken} />` back in,
  right **before** the `{wlError && …}` line.
- Drop HEAD's old unlabelled inputs (exactly one email, one industry, one submit should remain).

## 4. Honeypot / Turnstile keep rule (EMP-WL-070), applies to #4, #16, #19 (and #2)

PR #11 added a hidden honeypot field (`wl-website`) and `<TurnstileWidget onToken={onTurnstileToken} />`
to the waitlist form, plus the `useCallback` import they need. When a later PR conflicts in
`Landing.jsx`, taking "their side" **silently deletes the bot protection**. The build still
passes and the form still works, so nothing visibly breaks.

When resolving #4, #16, #19 (or #2):

1. Keep both import sets and both hook blocks (`useCallback` must stay).
2. Keep the incoming PR's inputs (labels, translations), **plus** #11's honeypot block and
   `<TurnstileWidget onToken={onTurnstileToken} />`.
3. Check after resolving, from the repo root:

   ```bash
   f=frontend/src/pages/Landing.jsx
   rg -c 'wl-website" name' $f     # expect 1
   rg -c '<TurnstileWidget' $f      # expect 1
   rg -c 'data-testid="waitlist-submit"' $f   # expect 1
   cd frontend && CI=true npx craco test --watchAll=false src/pages/Landing.waitlist.test.js
   ```

## 5. General rules

- No force-push or rebase on these branches. Merge commits only.
- After each conflicted merge, run the backend unit tests (`cd backend && pytest -q tests/test_fix_*.py tests/test_waitlist_*.py tests/test_admin_reset_real_mongo.py tests/test_estimator_waitlist_fields.py`) and frontend tests
  (`cd frontend && CI=true npx craco test --watchAll=false`) before the next merge.
- Merging is not deploying. Deploys stay a separate step that Brann approves.
