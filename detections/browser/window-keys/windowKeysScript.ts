import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';

export default function windowKeysScript(
  ctx: IRequestContext,
  skipProps = [
    'Fingerprint2',
    'pageQueue',
    'afterQueueComplete',
    'pageLoaded',
    'axios',
    'justAFunction',
  ],
) {
  return `
<script type="text/javascript">
(function() {
  const skipProps = ${JSON.stringify(skipProps)};

  let keys = Object.getOwnPropertyNames(window);
  try {
    for (const key of Object.getOwnPropertySymbols(window)) {
      keys.push('' + String(key));
    }
  } catch (err) {}

  try {
    for (let key in window) {
      if (!keys.includes(key)) keys.push('' + String(key));
    }
  } catch (err) {}

  keys = keys.filter(x => !skipProps.includes(x) && !x.endsWith('_GLOBAL_HOOK__'));

  const promise = fetch("${ctx.trackUrl('/windowKeys')}", {
    method: 'POST',
    body: JSON.stringify({
      keys,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  window.pageQueue.push(promise);
})();
</script>`;
}
