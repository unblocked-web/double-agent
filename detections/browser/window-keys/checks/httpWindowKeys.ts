import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import WindowKeysProfile from '../lib/WindowKeysProfile';
import { flaggedCheckFromRequest } from '@double-agent/runner/lib/flagUtils';

const debug = process.env.DEBUG ?? false;

export default async function checkHttpWindowKeys(ctx: IRequestContext, windowKeys: string[]) {
  const browserProfile = await WindowKeysProfile.find(ctx.session.useragent);
  if (!browserProfile || !browserProfile.httpWindowKeys) return;

  const browserProfileKeys = browserProfile.httpWindowKeys;

  logDetails(browserProfileKeys, windowKeys);

  ctx.session.recordCheck(Boolean(browserProfileKeys.toString() !== windowKeys.toString()), {
    ...flaggedCheckFromRequest(ctx, 'browser', 'Dom Features Match Version'),
    checkName: 'Insecure Page - Window Keys',
    description:
      'Checks that all the window property and type keys match the browser defaults on an insecure page (browsers disable certain features on non-ssl pages).',
    value: windowKeys.toString(),
    expected: browserProfileKeys.toString(),
    pctBot: 95,
  });
}

function logDetails(browserProfileKeys: string[], windowKeys: string[]) {
  if (debug) {
    const missingKeys = browserProfileKeys.filter(x => !windowKeys.includes(x));
    const extraKeys = windowKeys.filter(x => !browserProfileKeys.includes(x));
    if (extraKeys.length) console.log('Extra in http key\n', extraKeys.join('\n'));
    if (missingKeys.length) console.log('Missing in http keys\n', missingKeys.join('\n'));
  }
}
