import type { Page } from "@playwright/test";
export async function openDetails(page: Page, label: string) {
  const summary = page
    .locator("summary")
    .filter({
      hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    });
  if (
    !(await summary.evaluate(
      (e) => (e.parentElement as HTMLDetailsElement).open,
    ))
  )
    await summary.click();
}
