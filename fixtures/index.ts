import { mergeTests } from '@playwright/test';
import { test as pages } from './test';
import { test as api } from './api';

/** Everything in one place: page objects (UI) plus api / apiB / seed (data). */
export const test = mergeTests(pages, api);
export { expect } from '@playwright/test';
