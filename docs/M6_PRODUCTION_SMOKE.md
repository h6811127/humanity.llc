# M6 Production Smoke — Vouch scan truth

**Status:** Smoke runner shipped; production execution pending
**Parent:** `docs/M6_VOUCHING_DESIGN.md` Step 1 production smoke

---

## Goal

Verify deployed scan HTML and status JSON agree for the M6 human-trust states:

1. 0 accepted vouches → `Registered`
2. 2 accepted vouches → progress copy, not `Vouched Human`
3. 3 accepted vouches → `Vouched Human`
4. Disabled/revoked card → positive vouch label is overridden

This is a production smoke check, not a fixture generator. Create or select test records first, then run the command below against those records.

---

## Command

```bash
npm run worker:m6-vouch-smoke -- --origin=https://humanity.llc --cases=./m6-smoke-cases.json
```

Use `--origin=http://127.0.0.1:8787` for a local Worker after running migrations and seeding equivalent records.

---

## Case file format

```json
[
  {
    "name": "0 vouches",
    "profile_id": "PROFILE_WITH_ZERO_VOUCHES",
    "qr_id": "qr_ZERO_VOUCHES",
    "expected": {
      "kind": "active",
      "vouch_count": 0,
      "human_trust_label": "Registered",
      "verification_state": "registered",
      "card_status": "active",
      "qr_status": "active",
      "scan_includes": ["Registered", "No accepted vouches"]
    }
  },
  {
    "name": "2 vouches",
    "profile_id": "PROFILE_WITH_TWO_VOUCHES",
    "qr_id": "qr_TWO_VOUCHES",
    "expected": {
      "kind": "active",
      "vouch_count": 2,
      "human_trust_label": "Registered",
      "verification_state": "registered",
      "card_status": "active",
      "qr_status": "active",
      "scan_includes": ["2 of 3 vouches accepted", "not yet a Vouched Human"]
    }
  },
  {
    "name": "3 vouches",
    "profile_id": "PROFILE_WITH_THREE_VOUCHES",
    "qr_id": "qr_THREE_VOUCHES",
    "expected": {
      "kind": "active",
      "vouch_count": 3,
      "human_trust_label": "Vouched Human",
      "verification_state": "verified_human",
      "card_status": "active",
      "qr_status": "active",
      "scan_includes": ["Vouched Human", "3 accepted vouches"]
    }
  },
  {
    "name": "revoked card override",
    "profile_id": "REVOKED_PROFILE_WITH_THREE_VOUCHES",
    "qr_id": "qr_REVOKED_CARD",
    "expected": {
      "kind": "card_revoked",
      "status_http": 410,
      "scan_http": 410,
      "vouch_count": 3,
      "human_trust_label": "Disabled",
      "card_status": "revoked",
      "scan_includes": ["This card has been disabled"]
    }
  }
]
```

---

## Pass criteria

- Each status endpoint returns the expected HTTP status and `scan.kind`.
- Status JSON exposes the expected `scan.verification.vouch_count`.
- Status JSON exposes the expected `scan.human_trust.label`.
- Scan HTML includes the configured human-readable snippets.
- The revoked/disabled case does not present the positive vouch label as the active human-trust state.

---

## Notes

- Do not store this case file with private operator data if test records are not intended to be public.
- Use public test profiles only; the smoke command only reads deployed scan/status endpoints.
- Keep production smoke output as launch evidence, not as scan analytics.
