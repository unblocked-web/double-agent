import IRequestContext from '@double-agent/collect/interfaces/IRequestContext';
import domScript from './domScript';
import PageNames from './interfaces/PageNames';

export function loadSharedWorker(ctx: IRequestContext) {
  return `
<script type=text/javascript>
(function sharedWorkerProbe() {
    const run = new Promise(resolve => {
        const sharedWorker = new SharedWorker('${ctx.buildUrl('/shared-worker.js')}');
        sharedWorker.port.start()
        sharedWorker.port.addEventListener('message', message => {
            sharedWorker.port.close()
            return resolve()
        })
    });
    self.pageQueue.push(run);
})();
</script>
`;
}

export function sharedWorkerScript(ctx: IRequestContext) {
  ctx.res.setHeader('Content-Type', 'application/javascript');
  ctx.res.end(`
    ${domScript(ctx, 'self')};
    onconnect = async message => {
		const port = message.ports[0]
        await self.afterQueueComplete('${PageNames.SharedWorkerDom}')
		port.postMessage('done')
	}
`);
}
