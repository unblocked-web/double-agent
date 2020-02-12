import 'source-map-support/register';
import Detector from './detector';

const port = process.env.PORT ?? 3006;

const server = new Detector();
server.start(() => Number(port)).catch(err => console.log('Error starting', err));
