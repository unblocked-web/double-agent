export default interface IDomainset {
  sameSite: string;
  crossSite: string;
  main: string;
  port: number;
  isSsl: boolean;
}

export function cleanDomain(domain: string, port: number) {
  if (String(port) === '443' || String(port) === '80') return domain;
  return `${domain}:${port}`;
}
