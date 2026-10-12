import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetSessionForTests } from '../services/session';

afterEach(() => {
  cleanup();
  resetSessionForTests();
  localStorage.clear();
  sessionStorage.clear();
});
