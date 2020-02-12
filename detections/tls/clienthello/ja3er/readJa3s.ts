import useragent from 'useragent';
import ja3s from './getAllUasJson.json';
import ja3Hashes from './getAllHashesJson.json';
/*
 * Supported Groups (formerly named "EC Named Curve").
 * https://www.iana.org/assignments/tls-parameters/tls-parameters.xhtml#tls-parameters-8
 */
import sslSupportedGroups from '../spec/supportedGroups.json';
import decimalExtensionCodes from '../spec/extensions.json';
import cipherHexCodes from '../spec/ciphers.json';
import { greaseCodes } from '../lib/parseHelloMessage';
import IJa3erClientHello from '../interfaces/IJa3erClientHello';

/**
 * Format of files
 * {"User-Agent": "Slack", "Count": 3, "md5": "3d72e4827837391cd5b6f5c6b2d5b1e1", "Last_seen": "2019-10-12 07:29:02"}
 */
export default function readJa3s() {
  const ja3s = readAllJa3s();
  const details = readAllJa3Hashes();
  const byMd5: {
    [hash: string]: {
      clientHello: IJa3erClientHello;
      firstReported: Date;
      count: number;
      userAgents: IUserAgentCount[];
    };
  } = {};

  const scraperFingerprints = [];

  for (const ja3 of ja3s) {
    const agent = useragent.lookup(ja3.userAgent);

    if (
      ja3.userAgent.toLowerCase().startsWith('scrapy') ||
      ja3.userAgent.toLowerCase().startsWith('node') ||
      ja3.userAgent.toLowerCase().startsWith('axios') ||
      ja3.userAgent.toLowerCase().startsWith('spam') ||
      ja3.userAgent.toLowerCase().startsWith('java') ||
      ja3.userAgent.toLowerCase().startsWith('python') ||
      ja3.userAgent.toLowerCase().startsWith('aria2') ||
      ja3.userAgent.toLowerCase().startsWith('apache-httpclient') ||
      ja3.userAgent.toLowerCase().startsWith('go-http-client')
    ) {
      scraperFingerprints.push(ja3.md5);
    }

    const entry = {
      os: agent.os.family,
      osv: agent.os.major + '.' + agent.os.minor,
      browser: agent.family,
      browserv: agent.major,
      agents: [ja3.userAgent],
      count: ja3.count,
      lastSeen: ja3.lastSeen,
    } as IUserAgentCount;
    if (byMd5[ja3.md5]) {
      const existing = byMd5[ja3.md5];
      const toMerge = existing.userAgents.find(
        x =>
          x.os === entry.os &&
          x.osv === entry.osv &&
          x.browser === entry.browser &&
          x.browserv === entry.browserv,
      );
      if (toMerge) {
        toMerge.count += entry.count;
        toMerge.agents.push(entry.agents[0]);
      } else {
        existing.userAgents.push(entry);
      }
      existing.count += entry.count;
    } else {
      byMd5[ja3.md5] = {
        ...details[ja3.md5],
        count: entry.count,
        userAgents: [entry],
      };
    }
    ja3.ja3 = details[ja3.md5];
  }

  return byMd5;
}

function readAllJa3s(): IEntry[] {
  return (ja3s as any[]).map(
    x =>
      ({
        userAgent: x['User-Agent'],
        count: x.Count,
        md5: x.md5,
        lastSeen: new Date(x.Last_seen),
      } as IEntry),
  );
}

function readAllJa3Hashes() {
  const ja3Details: { [key: string]: { clientHello: IJa3erClientHello; firstReported: Date } } = {};
  for (const x of ja3Hashes) {
    const [SSLVersion, Cipher, SSLExtension, EllipticCurve, EllipticCurvePointFormat] = x.ja3.split(
      ',',
    );
    ja3Details[x.md5] = {
      clientHello: {
        sslVersion:
          '0x' +
          Number(SSLVersion)
            .toString(16)
            .padStart(4, '0'),
        ciphers: Cipher?.split('-').map(x => {
          const code =
            '0x' +
            Number(x)
              .toString(16)
              .padStart(4, '0');
          const isGrease = greaseCodes.includes(Number(x));
          return `${cipherHexCodes[code] ?? (isGrease ? 'Grease' : 'unknown')} (${code})`;
        }),
        extensions: SSLExtension?.split('-').map(x => {
          return `${decimalExtensionCodes[x] ?? 'unknown'} (${x})`;
        }),
        supportedGroups: EllipticCurve?.split('-')?.map(x => {
          if (!x) return '';
          const code =
            '0x' +
            Number(x)
              .toString(16)
              .padStart(4, '0');
          const isGrease = greaseCodes.includes(Number(x));
          return `${sslSupportedGroups[code] ?? (isGrease ? 'Grease' : 'unknown')} (${x})`;
        }),
        curvePointFormats: EllipticCurvePointFormat?.split('-')?.map(x => {
          if (!x.trim().length) return '';
          return (
            '0x' +
            Number(x)
              .toString(16)
              .padStart(4, '0')
          );
        }),
      },
      firstReported: new Date(x.First_reported),
    };
  }
  return ja3Details;
}

export interface IUserAgentCount {
  os: string;
  osv: string;
  browser: string;
  browserv: string;
  agents: string[];
  count: number;
  lastSeen: Date;
}

interface IEntry {
  userAgent: string;
  count: number;
  md5: string;
  lastSeen: Date;
  ja3?: { clientHello: IJa3erClientHello; firstReported: Date };
}
