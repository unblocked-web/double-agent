import IRequestContext from '@double-agent/collect/interfaces/IRequestContext';
import domScript from './domScript';
import PageNames from './interfaces/PageNames';

export function loadDedicatedWorker(ctx: IRequestContext) {
  return `
<script type=text/javascript>
(function dedicatedWorkerProbe() {
    const run = new Promise(resolve => {
        const worker = new Worker('${ctx.buildUrl('/dedicated-worker.js')}');
        worker.onmessage = message => {
            worker.terminate()
            return resolve()
        }
    });
    self.pageQueue.push(run);
})();
</script>
`;
}

export function dedicatedWorkerScript(ctx: IRequestContext) {
  ctx.res.setHeader('Content-Type', 'application/javascript');
  ctx.res.end(`
    ${domScript(ctx, 'self')};
    self.afterQueueComplete('${PageNames.DedicatedWorkerDom}')
        .then(() => {
            postMessage('done');
            close();
        });
`);
}
