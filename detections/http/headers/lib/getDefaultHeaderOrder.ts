export default function getDefaultHeaderOrder(headers: string[]) {
  const rawOrder = headers.map(x => {
    const key = x.split('=').shift();
    if (key.match(/x-key-\d+/)) {
      return 'x-key-1';
    }
    return key;
  });
  const defaultKeys = rawOrder.filter(x => {
    const lower = x.toLowerCase();
    return defaultHeaders.includes(lower) || lower.startsWith('sec-') || lower.startsWith('proxy-');
  });
  return {
    rawOrder,
    defaultKeys,
  };
}

const defaultHeaders = [
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
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'public-key-pins',
  'range',
  'referer',
  'retry-after',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-user',
  'sec-origin-policy',
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
];
