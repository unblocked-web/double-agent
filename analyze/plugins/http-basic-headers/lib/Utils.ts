export function extractOfficialHeaderKeys(rawHeaders: string[][]) {
  return rawHeaders
    .map(x => x[0])
    .filter(x => {
      const lower = x.toLowerCase();
      for (const prefix of officialHeaderPrefixes) {
        if (lower.startsWith(prefix)) return true;
      }
      return officialHeaderKeys.has(lower);
    });
}

export function isOfficialHeader(key: string) {
  const keyLower = key.toLowerCase();
  for (const prefix of officialHeaderPrefixes) {
    if (keyLower.startsWith(prefix)) return true;
  }
  return officialHeaderKeys.has(keyLower);
}

// ToDo: Need to add these into officialDefaultValueKeys
// if (ctx.requestDetails.resourceType === ResourceType.WebsocketUpgrade) {
//   extraDefaultHeaders = ['Upgrade', 'Sec-WebSocket-Version', 'Sec-WebSocket-Extensions'];
// }

export function isOfficialDefaultValueKey(key: string) {
  return officialDefaultValueKeys.has(key.toLowerCase());
}

/////// /////////

const officialHeaderPrefixes = new Set([
  'sec-', // sec-fetch-mode, sec-fetch-site, sec-fetch-user, sec-origin-policy
  'proxy-', // proxy-authenticate, proxy-authorization, proxy-connection
]);

const officialHeaderKeys = new Set([
  'accept',
  'accept-charset',
  'accept-encoding',
  'accept-language',
  'accept-patch',
  'accept-ranges',
  'access-control-allow-credentials',
  'access-control-allow-headers',
  'access-control-allow-methods',
  'access-control-allow-origin',
  'access-control-expose-headers',
  'access-control-max-age',
  'access-control-request-headers',
  'access-control-request-method',
  'age',
  'allow',
  'alt-svc',
  'authorization',
  'cache-control',
  'connection',
  'content-disposition',
  'content-encoding',
  'content-language',
  'content-length',
  'content-location',
  'content-range',
  'content-type',
  'cookie',
  'date',
  'expect',
  'expires',
  'forwarded',
  'from',
  'host',
  'if-match',
  'if-modified-since',
  'if-none-match',
  'if-range',
  'if-unmodified-since',
  'last-modified',
  'location',
  'origin',
  'pragma',
  'public-key-pins',
  'range',
  'referer',
  'retry-after',
  'set-cookie',
  'strict-transport-security',
  'tk',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'upgrade-insecure-requests',
  'user-agent',
  'vary',
  'via',
  'warning',
  'www-authenticate',
]);

const officialDefaultValueKeys = new Set([
  'connection',
  'accept',
  'sec-fetch-site',
  'sec-fetch-mode',
  'sec-fetch-user',
  'sec-fetch-dest',
  'upgrade-insecure-requests',
  'accept-encoding',
  'accept-language', // Chrome headless will send en-US, while headed will send en-US,en;q=0.9 or en-US,en;q=0.9,und;q=0.8
]);
