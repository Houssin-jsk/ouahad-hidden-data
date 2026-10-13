import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createLoadingRun,
  loadingFrame,
  MINIMUM_LOADING_MS,
  type PresentationClock,
} from "../src/loading/presentation";
function virtualClock() {
  let time = 0,
    id = 0;
  const events = new Map<number, { at: number; fn: () => void }>();
  const clock: PresentationClock = {
    now: () => time,
    set(fn, ms) {
      events.set(++id, { at: time + ms, fn });
      return id;
    },
    clear(key) {
      events.delete(key);
    },
  };
  const advance = (to: number) => {
    while (true) {
      const next = [...events.entries()]
        .filter(([, v]) => v.at <= to)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      time = next[1].at;
      events.delete(next[0]);
      next[1].fn();
    }
    time = to;
  };
  return { clock, advance, events };
}
test("fast work is released at the configurable six-second minimum, never before", () => {
  const c = virtualClock(),
    released: number[] = [],
    indices: number[] = [];
  const run = createLoadingRun({
    clock: c.clock,
    onFrame: (f) => indices.push(f.presentedIndex),
    onReady: () => released.push(c.clock.now()),
  });
  c.advance(100);
  run.complete({ actual: "ready" });
  c.advance(5999);
  assert.deepEqual(released, []);
  c.advance(MINIMUM_LOADING_MS);
  assert.deepEqual(released, [6000]);
  assert.equal(c.events.size, 0);
  assert.deepEqual([...new Set(indices)], [0, 1, 2, 3, 4, 5]);
});
test("slow actual work cannot release or show completion at the minimum", () => {
  const c = virtualClock(),
    released: number[] = [];
  const run = createLoadingRun({
    clock: c.clock,
    onFrame: (f) => {
      if (!f.workReady) assert.ok(f.progress < 1);
    },
    onReady: () => released.push(c.clock.now()),
  });
  run.update("maps");
  c.advance(9000);
  assert.deepEqual(released, []);
  run.complete("real result");
  assert.deepEqual(released, [9000]);
  assert.equal(c.events.size, 0);
});
test("cancelling buffered fast results discards them and removes all timers", () => {
  const c = virtualClock();
  let released = false;
  const run = createLoadingRun({
    clock: c.clock,
    onFrame: () => {},
    onReady: () => {
      released = true;
    },
  });
  run.complete("old");
  c.advance(3000);
  run.cancel();
  c.advance(20000);
  run.complete("late");
  assert.equal(released, false);
  assert.equal(c.events.size, 0);
});
test("replacement has its own timing and only the latest result is released", () => {
  const c = virtualClock(),
    released: string[] = [];
  const old = createLoadingRun<string>({
    clock: c.clock,
    onFrame: () => {},
    onReady: (r) => released.push(r),
  });
  old.complete("old");
  c.advance(2000);
  old.cancel();
  const next = createLoadingRun<string>({
    clock: c.clock,
    onFrame: () => {},
    onReady: (r) => released.push(r),
  });
  next.complete("new");
  c.advance(7999);
  assert.deepEqual(released, []);
  c.advance(8000);
  assert.deepEqual(released, ["new"]);
});
test("duration and stage gates are independently tunable", () => {
  const c = virtualClock();
  let released = false;
  const run = createLoadingRun({
    clock: c.clock,
    minimumMs: 250,
    onFrame: () => {},
    onReady: () => {
      released = true;
    },
  });
  run.complete("ready");
  c.advance(249);
  assert.equal(released, false);
  c.advance(250);
  assert.equal(released, true);
  assert.equal(loadingFrame(6000, "sampling", false).presentedIndex, 1);
  assert.ok(loadingFrame(6000, "preparing", false).progress < 1);
  assert.equal(loadingFrame(6000, "preparing", true).progress, 1);
  assert.throws(
    () =>
      createLoadingRun({ minimumMs: -1, onFrame: () => {}, onReady: () => {} }),
    /Invalid/,
  );
});
