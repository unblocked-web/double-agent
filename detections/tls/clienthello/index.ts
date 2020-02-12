import 'source-map-support/register';
import Detector from './detector';

let startPort = 3005;
(async function() {
  const detector = new Detector();
  await detector.start(() => (startPort += 1)).catch(err => console.log(err));
})();
