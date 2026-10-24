import { expect, type Page } from "@playwright/test";

// Hold only delivery of the genuine worker result. No production delays, fake
// measurements or test-only branches enter the application.
export async function holdAnalysis(page: Page, enabled = true) {
  await page.addInitScript((enabled) => {
    const Native = Worker;
    Object.assign(window, {
      analysisHoldEnabled: enabled,
      heldAnalysis: false,
      releaseHeldAnalysis: () => {},
    });
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (event) => {
          if (
            event.data.result &&
            !event.data.testReleased &&
            (window as unknown as { analysisHoldEnabled: boolean })
              .analysisHoldEnabled
          ) {
            event.stopImmediatePropagation();
            Object.assign(window, {
              heldAnalysis: true,
              releaseHeldAnalysis: () => {
                Object.assign(window, { heldAnalysis: false });
                this.dispatchEvent(
                  new MessageEvent("message", {
                    data: { ...event.data, testReleased: true },
                  }),
                );
              },
            });
          }
        });
      }
    };
  }, enabled);
}
export async function setAnalysisHold(page: Page, enabled: boolean) {
  await page.evaluate(
    (enabled) =>
      Object.assign(window, {
        analysisHoldEnabled: enabled,
        heldAnalysis: false,
      }),
    enabled,
  );
}
export async function waitHeld(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { heldAnalysis: boolean }).heldAnalysis,
      ),
    )
    .toBe(true);
}
export async function releaseAnalysis(page: Page) {
  await page.evaluate(() =>
    (
      window as unknown as { releaseHeldAnalysis: () => void }
    ).releaseHeldAnalysis(),
  );
}
