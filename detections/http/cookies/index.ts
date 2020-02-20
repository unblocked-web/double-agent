import 'source-map-support/register';
import Detector from './detector';

const detector = new Detector();
const ports = [process.env.HTTP_PORT ?? 3006, process.env.HTTPS_PORT ?? 3007].map(Number);
detector.start(() => ports.shift()).catch(console.log);
