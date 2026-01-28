export async function foreverEvery(ms: number, fn: () => Promise<void>) {
  // Run immediately, then repeat forever
  while (true) {
    const start = Date.now();

    try {
      await fn();
    } catch (err) {
      // keep runner alive even if one tick fails
      console.error("⚠️ tick error:", err);
    }

    const elapsed = Date.now() - start;
    const wait = Math.max(0, ms - elapsed);
    await new Promise((r) => setTimeout(r, wait));
  }
}
