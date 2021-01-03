import { Page } from 'puppeteer';

export default async function cleanPuppeteerPageCache(page: Page) {
  // @ts-ignore
  const client = page._client;

  await client.send('Network.clearBrowserCookies');
  await client.send('Network.clearBrowserCache');
}
