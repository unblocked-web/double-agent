import IDetectionSession from '@double-agent/runner/interfaces/IDetectionSession';
import { IHeaderStats } from '../lib/getBrowserProfileStats';
import { IHeadersRequest } from '../lib/HeaderProfile';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import { isAgent } from '@double-agent/runner/lib/userAgentUtils';

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
      const agent = params.session.parsedUseragent;
      let pctBot = 99;
      if (header === 'Accept-Language') {
        if (!value) pctBot = 100;
        // chrome always includes a quality metric
        else if (agent.family === 'Chrome') {
          if (!value.includes(';q=')) pctBot = 100;
          if (defaultValues.includes(value.replace(',und;q=0.8', ''))) {
            // my chrome includes a "und" value. if that's here, just ignore it
            // TODO: is this something common?
            continue;
          }
        }
        // TODO: support languages other than english
      }

      // Chrome 80 sending not sending Sec-Fetch-Dest for Preflight on local machine... not sure why.
      if (
        header === 'Sec-Fetch-Dest' &&
        params.precheck.resourceType === ResourceType.Preflight &&
        isAgent(agent, 'Chrome', 80)
      ) {
        pctBot = 10;
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
