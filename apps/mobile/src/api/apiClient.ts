import { fetchAuthSession } from 'aws-amplify/auth';

import { getMobileConfig } from '../config/mobileConfig';

const { apiUrl } = getMobileConfig();

/** Sends an authenticated request to the configured Bitebook API. */
export async function authenticatedApiRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const { tokens } = await fetchAuthSession();
  const accessToken = tokens?.accessToken.toString();
  if (!accessToken) throw new Error('Authentication required');

  const headers = new Headers(init?.headers);
  headers.set('accept', 'application/json');
  headers.set('authorization', `Bearer ${accessToken}`);

  const response = await fetch(new URL(path, apiUrl), {
    ...init,
    headers,
  });
  if (!response.ok) {
    throw new Error(`Bitebook API request failed (${response.status})`);
  }
  return response;
}
