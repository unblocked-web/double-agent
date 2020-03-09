import IDetectionSession from '@double-agent/runner/interfaces/IDetectionSession';
import { IHeaderStats } from '../lib/getBrowserProfileStats';
import { IHeadersRequest } from '../lib/HeaderProfile';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';

export default function checkDefaultValues(params: {
  session: IDetectionSession;
  precheck: Pick<
    IFlaggedCheck,
    'layer' | 'category' | 'requestIdx' | 'resourceType' | 'originType' | 'secureDomain'
  >;
  request: IHeadersRequest;
  browserStats: IHeaderStats;
  extraHeaders?: string[];
}) {
  const defaults = params.browserStats.defaults;
  const { extraHeaders, request } = params;
  const headers = headerDefaultsToCheck.concat(extraHeaders ?? []);

  for (const header of headers) {
    const value = request.headers
      .find(x => x.toLowerCase().startsWith(header.toLowerCase() + '='))
      ?.split('=')
      .slice(1)
      .join('=');

    const defaultValues = defaults[header] ?? defaults[header.toLowerCase()];
    let passing = false;
    if (defaultValues && defaultValues.length) {
      passing = defaultValues.includes(value);
    } else {
      passing = !value;
    }

    if (!passing) {
      let pctBot = 99;
      if (header === 'Accept-Language') {
        if (!value) pctBot = 100;
        // chrome always includes a quality metric
        else if (params.session.parsedUseragent.family === 'Chrome') {
          if (!value.includes(';q=')) pctBot = 100;
          if (defaultValues.includes(value.replace(',und;q=0.8', ''))) {
            // my chrome includes a "und" value. if that's here, just ignore it
            // TODO: is this something common?
            continue;
          }
        }
        // TODO: support languages other than english
      }
      params.session.flaggedChecks.push({
        ...params.precheck,
        checkName: 'Header has a Browser Default Value for: ' + header,
        description: `Checks if the request has a header value for ${header} matching the default values sent for this user agent`,
        value,
        pctBot,
        expected: defaultValues?.join(', '),
      });
    }
  }
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
