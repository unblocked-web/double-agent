import { IClientHello } from './parseHelloMessage';
import crypto from 'crypto';

/**
 * SSLVersion,Cipher,SSLExtension,EllipticCurve,EllipticCurvePointFormat
 Example:

 769,47-53-5-10-49161-49162-49171-49172-50-56-19-4,0-10-11,23-24-25,0
 If there are no SSL Extensions in the Client Hello, the fields are left empty.

 Example:

 769,4-5-10-9-100-98-3-6-19-18-99,,,

 These strings are then MD5 hashed to produce an easily consumable and shareable 32 character fingerprint. This is the JA3 SSL Client Fingerprint.

 769,47-53-5-10-49161-49162-49171-49172-50-56-19-4,0-10-11,23-24-25,0 --> ada70206e40642a3e4461f35503241d5
 769,4-5-10-9-100-98-3-6-19-18-99,,, --> de350869b8c85de67a350c8d186f11e6
 * @param clientHello
 */
export default function buildJa3(clientHello: IClientHello) {
  const sslVersion = Number(clientHello.version.split(' ').shift());

  const ciphers = clientHello.ciphers.map(x =>
    parseInt(
      x
        .split('} ')
        .shift()
        .replace('{', '')
        .replace(/0x/g, '')
        .replace(', ', ''),
      16,
    ),
  );

  if (!clientHello.extensions) {
    return {
      combined: "Couldn't read",
      ja3: {
        value: "couldn't read",
        md5: '',
      },
      raw: {
        sslVersion: 0,
        ciphers: [],
        extensions: [],
        curve: [],
        pointFormats: [],
      },
    };
  }

  const extensions = clientHello.extensions?.map(x => x.decimal) ?? [];

  const curve = clientHello.extensions
    .find(x => x.type === 'supported_groups')
    ?.values.map(x => x.match(/\((\d+)\)/)[1])
    .map(Number);

  const pointFormats = clientHello.extensions
    .find(x => x.type === 'ec_point_formats')
    .values.map(x => x.match(/\((\d+)\)/)[1])
    .map(Number);

  const cleaned = `${sslVersion},${cleanGrease(ciphers)},${cleanGrease(extensions)},${cleanGrease(
    curve,
  )},${cleanGrease(pointFormats)}`;
  return {
    combined: `${sslVersion},${ciphers.join('-')},${extensions.join('-')},${curve.join(
      '-',
    )},${pointFormats.join('-')}`,
    ja3: {
      value: cleaned,
      md5: crypto
        .createHash('md5')
        .update(cleaned)
        .digest('hex'),
    },
    raw: {
      sslVersion,
      ciphers,
      extensions,
      curve,
      pointFormats,
    },
  } as IJa3Package;
}

export function cleanGrease(nums: number[]): string {
  if (!nums || !nums.length) return '';
  return nums.filter(x => !greaseCiphers.includes(x)).join('-');
}

export interface IJa3 {
  value: string;
  md5: string;
}
export interface IJa3Package {
  combined: string;
  ja3: IJa3;
  raw: {
    sslVersion: number;
    ciphers: number[];
    extensions: number[];
    curve: number[];
    pointFormats: number[];
  };
}
const greaseCiphers = [
  0x0a0a,
  0x1a1a,
  0x2a2a,
  0x3a3a,
  0x4a4a,
  0x5a5a,
  0x6a6a,
  0x7a7a,
  0x8a8a,
  0x9a9a,
  0xaaaa,
  0xbaba,
  0xcaca,
  0xdada,
  0xeaea,
  0xfafa,
];
