import IRequestContext from '@double-agent/collect/interfaces/IRequestContext';
import domScript from './domScript';
import PageNames from './interfaces/PageNames';

export function waitForIframe() {
  return `
<script type=text/javascript>
     const promise = new Promise(resolve => {
         window.addEventListener('message', event => {
            if (event.data && event.data.readDom === true) {
                resolve();
            }
        }, false);
     });
     window.pageQueue.push(promise);
</script>
`;
}

export function iframePage(ctx: IRequestContext) {
  const testName = ctx.url.searchParams.get('page-name') ?? PageNames.IFrameDom;
  ctx.res.setHeader('Content-Type', 'text/html');

  const html = `<!doctype html><html><body>
<h5>IFrame DOM Test</h5>
<script type="text/javascript">
${domScript(ctx, 'window')}

self.window.afterQueueComplete('${testName}').then(() =>
  window.parent.postMessage({ readDom: true }));
</script>
</body></html>`;
  ctx.res.end(html);
}
