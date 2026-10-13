import { test } from '@playwright/test'

export function contract(id, title, run) {
  test(`${id} — ${title}`, run)
}
