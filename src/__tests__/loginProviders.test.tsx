import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login/Login';
import * as authApi from '../api/auth';
import * as authService from '../services/auth.service';

beforeEach(() => {
  vi.spyOn(authService, 'loadSession').mockResolvedValue(null as never);
  vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
});

function renderLogin() {
  return render(<MemoryRouter><Login /></MemoryRouter>);
}

describe('Login sign-in methods', () => {
  it('hides Google sign-in when the instance has not configured it', async () => {
    vi.spyOn(authApi, 'getAuthProviders').mockResolvedValue({ password: true, google: false });
    renderLogin();
    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument();
  });

  it('offers Google sign-in when it is configured', async () => {
    vi.spyOn(authApi, 'getAuthProviders').mockResolvedValue({ password: true, google: true });
    renderLogin();
    expect(await screen.findByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });
});
