import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VisionSession,
  rankPredictions,
  inferWithFallback,
} from "../src/ai/engine";
import { runVision } from "../src/ai/client";
import { UNCERTAIN_SCORE } from "../src/ai/types";

test("one initialization shared by concurrent requests; warm reuse", async () => {
  let calls = 0;
  const session = new VisionSession(async (backend) => {
    calls++;
    return { backend };
  });
  const [a, b] = await Promise.all([
    session.initialize(false),
    session.initialize(false),
  ]);
  assert.equal(calls, 1);
  assert.equal(a.reused, false);
  assert.equal(b.reused, true);
  assert.equal((await session.initialize(true)).backend, "wasm");
  assert.equal(calls, 1);
});
test("WebGPU initialization failure falls back to WASM, missing GPU skips it", async () => {
  const calls: string[] = [];
  const session = new VisionSession(async (backend) => {
    calls.push(backend);
    if (backend === "webgpu") throw Error("unsupported");
    return true;
  });
  assert.equal((await session.initialize(true)).backend, "wasm");
  assert.deepEqual(calls, ["webgpu", "wasm"]);
  session.reset();
  await session.initialize(false);
  assert.deepEqual(calls, ["webgpu", "wasm", "wasm"]);
});
test("failed download or unsupported WASM can retry without a poisoned promise", async () => {
  let failed = true;
  const session = new VisionSession(async () => {
    if (failed) throw Error("offline");
    return "loaded";
  });
  await assert.rejects(session.initialize(false));
  failed = false;
  assert.equal((await session.initialize(false)).reused, false);
});
test("GPU inference failure releases its session and retries WASM once", async () => {
  const calls: string[] = [];
  const session = new VisionSession(async (backend) => {
    calls.push(backend);
    return backend;
  });
  const loaded = await session.initialize(true);
  let disposed = false;
  const result = await inferWithFallback(
    loaded,
    session,
    async (backend) => {
      if (backend === "webgpu") throw Error("lost GPU");
      return 42;
    },
    async () => {
      disposed = true;
    },
    () => calls.push("fallback"),
  );
  assert.equal(result.output, 42);
  assert.equal(result.loaded.backend, "wasm");
  assert.ok(disposed);
  assert.deepEqual(calls, ["webgpu", "fallback", "wasm"]);
});
test("standard stable softmax uses all 1000 logits, uniform output is uncertain", () => {
  const labels = Object.fromEntries(
    Array.from({ length: 1000 }, (_, i) => [i, `class ${i}`]),
  );
  const flat = rankPredictions(new Float32Array(1000).fill(10000), labels);
  assert.equal(flat.length, 5);
  assert.equal(flat[0].score, 0.001);
  assert.ok(flat[0].score < UNCERTAIN_SCORE);
  const logits = new Float32Array(1000);
  logits[9] = Math.log(999);
  const top = rankPredictions(logits, labels)[0];
  assert.equal(top.label, "class 9");
  assert.ok(Math.abs(top.score - 0.5) < 1e-6);
  assert.throws(() => rankPredictions([1, 2], labels));
  logits[0] = NaN;
  assert.throws(() => rankPredictions(logits, labels));
});
test("client supersedes work, ignores late messages, and reuses completed worker", () => {
  const original = globalThis.Worker;
  const workers: FakeWorker[] = [];
  class FakeWorker {
    onmessage?: (event: { data: unknown }) => void;
    onerror?: () => void;
    terminated = false;
    constructor() {
      workers.push(this);
    }
    terminate() {
      this.terminated = true;
    }
    postMessage() {}
  }
  globalThis.Worker = FakeWorker as unknown as typeof Worker;
  const bitmap = { close() {} } as ImageBitmap;
  const events: string[] = [];
  try {
    runVision(bitmap, (e) => events.push(`old:${e.type}`));
    const oldCallback = workers[0].onmessage!;
    const stop = runVision(bitmap, (e) => events.push(e.type));
    assert.ok(workers[0].terminated);
    oldCallback({ data: { type: "result" } });
    assert.equal(events.length, 0);
    workers[1].onmessage!({ data: { type: "result" } });
    assert.equal(events.join(","), "result");
    stop();
    assert.equal(workers[1].terminated, false);
    const next = runVision(bitmap, (e) => events.push(e.type));
    assert.equal(workers.length, 2);
    next();
    assert.equal(workers[1].terminated, true);
  } finally {
    globalThis.Worker = original;
  }
});
