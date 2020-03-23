import { IHeaderStats } from '../lib/getBrowserProfileStats';
import { IHeadersRequest } from '../lib/HeaderProfile';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import DetectionSession from '@double-agent/runner/lib/DetectionSession';
import { Agent } from 'useragent';

export default function checkDefaultValues(params: {
  session: DetectionSession;
  precheck: Pick<
    IFlaggedCheck,
    'layer' | 'category' | 'requestIdx' | 'resourceType' | 'originType' | 'secureDomain'
  >;
  request: IHeadersRequest;
  browserStats: IHeaderStats;
  extraHeaders?: string[];
}) {
  const hasBrowserStats = !!params.browserStats;
  const defaults = params.browserStats?.defaults ?? {};
  const { extraHeaders, request } = params;
  const headers = headerDefaultsToCheck.concat(extraHeaders ?? []);

  for (const header of headers) {
    const value = request.headers
      .find(x => x.toLowerCase().startsWith(header.toLowerCase() + '='))
      ?.split('=')
      .slice(1)
      .join('=');

    const defaultValues = defaults[header] ?? defaults[header.toLowerCase()];

    const agent = params.session.parsedUseragent;
    const shouldFlag = hasBrowserStats && shouldFlagResult(header, value, defaultValues, agent);
    const pctBot = getBotScore(header, value, params.precheck.resourceType, agent);

    const checkName = defaultValues?.length
      ? `Header has a Browser Default Value for: ${header}`
      : `Header Should NOT be Included: ${header}`;

    params.session.recordCheck(shouldFlag, {
      ...params.precheck,
      checkName,
      description: `Checks if the request has a header value for ${header} matching the default values sent for this user agent`,
      value,
      pctBot,
      expected: defaultValues?.join(', '),
    });
  }
}

function shouldFlagResult(header: string, value: string, defaultValues: string[], agent: Agent) {
  let shouldFlagResult;
  if (defaultValues && defaultValues.length) {
    shouldFlagResult = !defaultValues.includes(value);
  } else {
    shouldFlagResult = !!value;
  }

  const isAcceptLanguageOnChrome = header === 'Accept-Language' && agent.family === 'Chrome';
  if (shouldFlagResult && isAcceptLanguageOnChrome && !!value) {
    if (defaultValues.includes(value.replace(',und;q=0.8', ''))) {
      // my chrome includes a "und" value. if that's here, just ignore it
      // TODO: is this something common?
      return false;
    }
    // TODO: support languages other than english
  }
  return shouldFlagResult;
}

function getBotScore(header: string, value: string, resourceType: ResourceType, agent: Agent) {
  let pctBot = 99;
  // no accept language header happens in headless chrome by default. no other agents I've tested
  if (header === 'Accept-Language' && !value) pctBot = 100;

  // chrome workarounds
  if (agent.family === 'Chrome') {
    // Chrome not sending a quality score has only been observed on very old browsers and headless
    if (value && !value.includes(';q=')) pctBot = 100;

    // Chrome 80 sending not sending Sec-Fetch-Dest for Preflight on local machine... not sure why.
    if (
      header === 'Sec-Fetch-Dest' &&
      resourceType === ResourceType.Preflight &&
      agent.major === '80'
    ) {
      pctBot = 10;
    }
  }
  return pctBot;
}

export const headerDefaultsToCheck = [
  'Connection',
  'Accept',
  'Sec-Fetch-Site',
  'Sec-Fetch-Mode',
  'Sec-Fetch-User',
  'Sec-Fetch-Dest',
  'Upgrade-Insecure-Requests',
  'Accept-Encoding',
  'Accept-Language', // Chrome headless will send en-US, while headed will send en-US,en;q=0.9 or en-US,en;q=0.9,und;q=0.8
];
