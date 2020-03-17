export default function fingerprintScript(dest: string) {
  return `
<script type="text/javascript">
  const browserIgnoredAttributes = ${JSON.stringify(browserIgnoredAttributes)};
  const sessionIgnoredAttributes = ${JSON.stringify(sessionIgnoredAttributes)};
  let fingerprintResolved;
  let fingerprintReject;
  const fingerprintPromise = new Promise((resolve, reject) => {
    fingerprintResolved = resolve;
    fingerprintReject = reject;
  });
  
  function fingerprint() {
    Fingerprint2.get(
      {
        // exclude all the "Detections" of false behavior - we cover these in other places
        excludes: {
          enumerateDevices: false,
          pixelRatio: false,
          doNotTrack: false,
        },
      },
      components => {
        try {
          const browserValues = components
            .filter(x => !browserIgnoredAttributes.includes(x.key))
            .map(x => x.value);
          
          const sessionValues = components
            .filter(x => !sessionIgnoredAttributes.includes(x.key))
            .map(x => x.value);
  
          const browserHash = Fingerprint2.x64hash128(browserValues.join(''), 31);
          const sessionHash = Fingerprint2.x64hash128(sessionValues.join(''), 31);
  
          fetch("${dest}", {
            method: 'POST',
            body: JSON.stringify({
              components,
              browserHash,
              sessionHash,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
          }).then(fingerprintResolved).catch(fingerprintReject);
        } catch(err) {
          fingerprintReject(err)
        }
      },
    );
  }

  window.pageQueue.push(fingerprintPromise);
  
  if (window.requestIdleCallback) {
    requestIdleCallback(fingerprint);
  } else {
    setTimeout(fingerprint, 500);
  }
</script>`;
}

const useragentAttributes = ['userAgent', 'platform'];

// unstable across requests, per https://github.com/Valve/fingerprintjs2/wiki/Stable-components
const unstableAttributes = ['canvas', 'webgl', 'enumerateDevices'];
const checkedOtherPlaces = [
  'webdriver',
  'hasLiedLanguages',
  'hasLiedResolution',
  'hasLiedOs',
  'hasLiedBrowser',
];

export const browserIgnoredAttributes = useragentAttributes.concat(checkedOtherPlaces);
export const sessionIgnoredAttributes = unstableAttributes.concat(checkedOtherPlaces);
