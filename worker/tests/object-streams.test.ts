import { describe, expect, it } from "vitest";

import {
  buildObjectStreamsFromFormRows,
  normalizeObjectStreams,
  parseObjectStreamsFromDocument,
} from "../../site/js/object-streams-core.mjs";
import { objectStreamsFromCardDocumentJson } from "../src/validation/object-streams";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { scanStatusBodyFromViewModel } from "../src/resolver/scan-status";
import { renderScanPage } from "../src/resolver/scan-html";
import { OBJECT_STREAMS_LIMIT, OBJECT_PUBLIC_SNAPSHOT_LIMIT } from "../src/resolver/trust-copy";

describe("object_streams validation", () => {
  it("accepts up to four plain-text streams", () => {
    const streams = normalizeObjectStreams([
      { id: "tasks", class: "care", label: "Today's tasks", value: "Water bed 3" },
      { id: "tools", class: "place", label: "Tools", value: "Wheelbarrow out" },
    ]);
    expect(streams).toHaveLength(2);
    expect(streams[0]?.id).toBe("tasks");
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      normalizeObjectStreams([
        { id: "tasks", label: "A", value: "One" },
        { id: "tasks", label: "B", value: "Two" },
      ])
    ).toThrow(/Duplicate/);
  });

  it("builds streams from owner form rows and skips empty rows", () => {
    const streams = buildObjectStreamsFromFormRows([
      { label: "Today's tasks", value: "Water bed 3", class: "care" },
      { label: "", value: "" },
      { label: "Tools", value: "Available" },
    ]);
    expect(streams).toHaveLength(2);
    expect(streams[0]?.class).toBe("care");
  });

  it("parses streams from signed card document json", () => {
    const doc = {
      object_streams: [{ id: "note", class: "narrative", label: "Note", value: "Open late" }],
    };
    expect(parseObjectStreamsFromDocument(doc)).toHaveLength(1);
    expect(
      objectStreamsFromCardDocumentJson(JSON.stringify(doc))
    ).toEqual(parseObjectStreamsFromDocument(doc));
  });
});

describe("scan surfaces object_streams", () => {
  const profileId = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
  const qrId = "qr_teststreams0001";
  const cardDocumentJson = JSON.stringify({
    object_streams: [
      { id: "tasks", class: "care", label: "Today's tasks", value: "Compost turn" },
    ],
  });

  it("includes object_streams on status JSON for active scans", () => {
    const vm = buildScanViewModel(
      profileId,
      qrId,
      {
        card: {
          profile_id: profileId,
          public_key: "pk",
          handle: "garden_gate",
          handle_normalized: "garden_gate",
          manifesto_line: "Community garden\nOpen · volunteers welcome",
          status: "active",
          card_document_json: cardDocumentJson,
          created_at: "2026-05-16T17:00:00.000Z",
          updated_at: "2026-05-17T12:00:00.000Z",
        },
        qr: {
          qr_id: qrId,
          profile_id: profileId,
          epoch: 1,
          scope: "card",
          print_artifact_id: null,
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload: `https://humanity.llc/c/${profileId}?q=${qrId}`,
          issued_at: "2026-05-16T17:00:00.000Z",
          expires_at: null,
          credential_document_json: null,
          created_at: "2026-05-16T17:00:00.000Z",
          updated_at: "2026-05-16T17:00:00.000Z",
        },
        verification: null,
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.card?.object_streams).toEqual([
      {
        id: "tasks",
        class: "care",
        label: "Today's tasks",
        value: "Compost turn",
      },
    ]);
    expect(body.scan.limits.object_details_warning).toBe(OBJECT_STREAMS_LIMIT);
  });

  it("omits object_details_warning when no streams", () => {
    const vm = buildScanViewModel(
      profileId,
      qrId,
      {
        card: {
          profile_id: profileId,
          public_key: "pk",
          handle: "garden_gate",
          handle_normalized: "garden_gate",
          manifesto_line: "Community garden\nOpen · volunteers welcome",
          status: "active",
          card_document_json: "{}",
          created_at: "2026-05-16T17:00:00.000Z",
          updated_at: "2026-05-17T12:00:00.000Z",
        },
        qr: {
          qr_id: qrId,
          profile_id: profileId,
          epoch: 1,
          scope: "card",
          print_artifact_id: null,
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload: `https://humanity.llc/c/${profileId}?q=${qrId}`,
          issued_at: "2026-05-16T17:00:00.000Z",
          expires_at: null,
          credential_document_json: null,
          created_at: "2026-05-16T17:00:00.000Z",
          updated_at: "2026-05-16T17:00:00.000Z",
        },
        verification: null,
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.limits.object_details_warning).toBeUndefined();
  });

  it("renders object_streams on status plate scan html", async () => {
    const vm = buildScanViewModel(
      profileId,
      qrId,
      {
        card: {
          profile_id: profileId,
          public_key: "pk",
          handle: "garden_gate",
          handle_normalized: "garden_gate",
          manifesto_line: "Community garden\nOpen · volunteers welcome",
          status: "active",
          card_document_json: cardDocumentJson,
          created_at: "2026-05-16T17:00:00.000Z",
          updated_at: "2026-05-17T12:00:00.000Z",
        },
        qr: {
          qr_id: qrId,
          profile_id: profileId,
          epoch: 1,
          scope: "card",
          print_artifact_id: null,
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload: `https://humanity.llc/c/${profileId}?q=${qrId}`,
          issued_at: "2026-05-16T17:00:00.000Z",
          expires_at: null,
          credential_document_json: null,
          created_at: "2026-05-16T17:00:00.000Z",
          updated_at: "2026-05-16T17:00:00.000Z",
        },
        verification: null,
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("scan-object-streams");
    expect(html).toContain("Today's tasks");
    expect(html).toContain("Compost turn");
    expect(html).toContain("scan-object-streams-limit");
    expect(html).toContain("steward-signed public copy");
    expect(html).toContain("scan-public-snapshot");
    expect(html).toContain("Signed snapshot");
    expect(html).toContain(OBJECT_PUBLIC_SNAPSHOT_LIMIT);
    expect(html).toContain("scan-ai-explain-btn");
    expect(html).toContain("Explain in plain language");
    expect(html).toContain("Plain-language help");
    expect(html).not.toContain("AI summary");
    expect(html).toContain("scan-ai-explain.mjs");
  });

  it("includes public_snapshot in status JSON when object_streams present", () => {
    const vm = buildScanViewModel(
      profileId,
      qrId,
      {
        card: {
          profile_id: profileId,
          public_key: "pk",
          handle: "garden_gate",
          handle_normalized: "garden_gate",
          manifesto_line: "Community garden\nOpen · volunteers welcome",
          status: "active",
          card_document_json: cardDocumentJson,
          created_at: "2026-05-16T17:00:00.000Z",
          updated_at: "2026-05-17T12:00:00.000Z",
        },
        qr: {
          qr_id: qrId,
          profile_id: profileId,
          epoch: 1,
          scope: "card",
          print_artifact_id: null,
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload: `https://humanity.llc/c/${profileId}?q=${qrId}`,
          issued_at: "2026-05-16T17:00:00.000Z",
          expires_at: null,
          credential_document_json: null,
          created_at: "2026-05-16T17:00:00.000Z",
          updated_at: "2026-05-16T17:00:00.000Z",
        },
        verification: null,
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const body = scanStatusBodyFromViewModel(vm);
    expect(body.scan.card?.public_snapshot?.text).toContain("Community garden");
    expect(body.scan.card?.public_snapshot?.text).toContain("Today's tasks");
    expect(body.scan.limits.object_snapshot_warning).toBe(OBJECT_PUBLIC_SNAPSHOT_LIMIT);
    expect(body.scan.limits.ai_explain_warning).toContain("Plain-language summary");
    expect(body.scan.ai?.explain.endpoint).toBe(
      "/.well-known/hc/v1/ai/explain-snapshot"
    );
    expect(body.scan.ai?.agent_context.public_snapshot.text).toContain(
      "Community garden"
    );
  });
});
