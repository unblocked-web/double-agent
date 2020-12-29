import IRequestContext from '@double-agent/collect/interfaces/IRequestContext';
import domScript from './domScript';
import PageNames from './interfaces/PageNames';

export function loadServiceWorker(ctx: IRequestContext) {
  return `
<script type=text/javascript>
(function serviceWorkerProbe() {
    const run = new Promise(resolve => {
        navigator.serviceWorker.register("${ctx.buildUrl('/service-worker.js')}");
        navigator.serviceWorker.ready.then(registration => {
            const broadcast = new BroadcastChannel('da_channel');
            broadcast.onmessage = () => {
                registration.unregister()
                broadcast.close()
                return resolve()
            }
            return broadcast.postMessage({ type: 'domScript' });
        });
    });
    self.pageQueue.push(run);
})();
</script>
`;
}

export function serviceWorkerScript(ctx: IRequestContext) {
  ctx.res.setHeader('Content-Type', 'application/javascript');
  ctx.res.end(`
    ${domScript(ctx, 'self')};
    const broadcast = new BroadcastChannel('da_channel')
    broadcast.onmessage = async event => {
        if (event.data && event.data.type == 'domScript') {
            await self.afterQueueComplete('${PageNames.ServiceWorkerDom}')
            broadcast.postMessage('done');
        }
    }
`);
}
