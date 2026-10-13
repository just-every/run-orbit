/** Observe native focus, including the body between browser Tab cycles. */
export async function tabTo(page, predicate) {
  for (let index = 0; index < 60; index++) {
    await page.keyboard.press('Tab');
    const handle = await page.evaluateHandle(() => document.activeElement);
    try {
      const active = handle.asElement();
      if (active && await predicate(active)) return;
    } finally { await handle.dispose(); }
  }
  throw new Error('The visible record control was not reachable with keyboard Tab.');
}
