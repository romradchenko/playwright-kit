import type { Page } from "@playwright/test";

import { authTest } from "../src/fixtures/createAuthTest";

type IsAny<T> = 0 extends 1 & T ? true : false;
type Assert<T extends true> = T;

const test = authTest({ defaultProfile: "user" });

test("page is typed", async ({ page }) => {
  type _pageIsNotAny = Assert<IsAny<typeof page> extends false ? true : false>;
  const _page: Page = page;
  void _page;
});

