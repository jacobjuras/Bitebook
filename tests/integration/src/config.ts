const API_URL_VARIABLE = 'BITEBOOK_API_URL';

/** Reads and validates the deployed Bitebook API base URL. */
export function getDeployedApiUrl(
  environment: NodeJS.ProcessEnv = process.env,
): URL {
  const value = environment[API_URL_VARIABLE];
  if (!value) {
    throw new Error(`${API_URL_VARIABLE} is required`);
  }

  const url = new URL(value);
  if (url.protocol !== 'https:') {
    throw new Error(`${API_URL_VARIABLE} must use HTTPS`);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`${API_URL_VARIABLE} must be an API base URL`);
  }

  return new URL(url.pathname.endsWith('/') ? url.href : `${url.href}/`);
}
