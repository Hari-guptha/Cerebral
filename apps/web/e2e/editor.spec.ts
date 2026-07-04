import { test, expect } from "@playwright/test";
import path from "path";

const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle id="c1" cx="50" cy="50" r="20" fill="#3b82f6"/>
</svg>`;

test.describe("SVG Animator E2E", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Animate SVGs/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Editor" })).toBeVisible();
  });

  test("editor loads and accepts SVG paste", async ({ page }) => {
    await page.goto("/editor");
    await expect(page.getByText("SVG Animator")).toBeVisible();

    const textarea = page.locator("textarea");
    await textarea.fill(sampleSvg);
    await page.keyboard.press("Control+v");

    // After paste handler, layers should appear
    await page.waitForTimeout(500);
  });

  test("editor route is accessible", async ({ page }) => {
    await page.goto("/editor");
    await expect(page.locator("header")).toContainText("SVG Animator");
    await expect(page.getByText("Drop SVG or .svganim file here")).toBeVisible();
  });
});
