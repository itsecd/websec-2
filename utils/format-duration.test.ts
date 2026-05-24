import assert from "node:assert/strict";
import test from "node:test";
import { formatDuration } from "./format-duration";

test("formats durations shorter than an hour in minutes", () => {
  assert.equal(formatDuration(25 * 60), "25 мин");
});

test("formats exact hours without minutes", () => {
  assert.equal(formatDuration(2 * 60 * 60), "2 ч");
});

test("formats hours with remaining minutes", () => {
  assert.equal(formatDuration(90 * 60), "1 ч 30 мин");
});
