import test from "node:test";
import assert from "node:assert/strict";
import { replaceUrlWithQuery } from "../lib/client-url";

type MockWindow = {
  location: { pathname: string; search: string };
  history: { replaceState: (_a: unknown, _b: string, nextPath: string) => void };
};

function withMockWindow(
  initial: { pathname: string; search: string },
  run: (ctx: { calls: string[]; win: MockWindow }) => void,
) {
  const previousWindow = (globalThis as { window?: unknown }).window;
  const calls: string[] = [];
  const win: MockWindow = {
    location: { pathname: initial.pathname, search: initial.search },
    history: {
      replaceState: (_a, _b, nextPath) => {
        calls.push(nextPath);
      },
    },
  };
  (globalThis as { window?: unknown }).window = win as unknown as Window;
  try {
    run({ calls, win });
  } finally {
    if (previousWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = previousWindow;
    }
  }
}

test("replaceUrlWithQuery updates and removes query params", () => {
  withMockWindow({ pathname: "/papers/overview", search: "?year=2024&prep=dp1" }, ({ calls }) => {
    replaceUrlWithQuery({ year: null, prep: "all", sort: "latest" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0], "/papers/overview?prep=all&sort=latest");
  });
});

test("replaceUrlWithQuery does not call replaceState for unchanged URL", () => {
  withMockWindow({ pathname: "/papers/overview", search: "?prep=dp1" }, ({ calls }) => {
    replaceUrlWithQuery({ prep: "dp1" });
    assert.equal(calls.length, 0);
  });
});

test("replaceUrlWithQuery is safe when window is unavailable", () => {
  const previousWindow = (globalThis as { window?: unknown }).window;
  delete (globalThis as { window?: unknown }).window;
  try {
    replaceUrlWithQuery({ prep: "dp1" });
    assert.ok(true);
  } finally {
    if (previousWindow !== undefined) {
      (globalThis as { window?: unknown }).window = previousWindow;
    }
  }
});

