import IRequestContext from '@double-agent/collect/interfaces/IRequestContext';

export default function script(ctx: IRequestContext) {
  return `
<script type="text/javascript">

(function uaProbe() {
  async function getVoices() {
    let voices = [];
    if (typeof speechSynthesis !== 'undefined') {
      if (!speechSynthesis.getVoices() || speechSynthesis.getVoices().length === 0) {
        if (speechSynthesis.onvoiceschanged !== undefined) {
          await Promise.race([
            new Promise(resolve => speechSynthesis.onvoiceschanged = resolve),
            new Promise(resolve => setTimeout(resolve, 1e3))
          ])
        } else {
          try {
            speechSynthesis.cancel();
          } catch (err){}
          await new Promise(resolve => setTimeout(resolve, 1e3))
        }
      }
      for (const { default: de,lang,localService,name,voiceURI } of speechSynthesis.getVoices()) {
        voices.push({ 'default': de,lang,localService,name,voiceURI })
      }
    }
    return fetch('${ctx.buildUrl('/save')}', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({voices}),
    });
  }
  
  window.pageQueue.push(getVoices());
})();
</script>`;
}
