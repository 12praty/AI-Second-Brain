import { test } from "@playwright/test";
import fs from "fs";

test("remove auth state", () => {
  try {
    fs.unlinkSync("playwright/.auth/user.json");
  } catch {}
});
