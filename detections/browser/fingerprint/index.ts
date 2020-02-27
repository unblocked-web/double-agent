import 'source-map-support/register';
import Detector from './detector';

let port = process.env.PORT ?? 3005;
(async function() {
  const detector = new Detector();
  await detector.start(() => Number(port)).catch(err => console.log(err));
})();
