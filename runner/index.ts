import 'source-map-support/register';
import DetectionsServer from './server/DetectionsServer';
import DirectiveServer from './server/DirectiveServer';

let directivesPort = Number(process.env.PORT ?? 3000);
let httpPort = Number(process.env.HTTP_PORT ?? 3001);
let httpsPort = Number(process.env.HTTPS_PORT ?? 3002);

(async function() {
  // this server loads all the modules in the "detections" directory and runs a bot detector
  const detectionsServer = await new DetectionsServer(httpPort, httpsPort).start();

  // this server simply provides instructions for a scraper to follow to "test" their stack
  const directiveServer = new DirectiveServer(detectionsServer);
  directiveServer
    .listen(directivesPort, () => {
      const domains = detectionsServer.httpsDomains;
      if (process.env.GENERATE_PROFILES) {
        console.log('\n\nGenerate Profiles mode activated');
        return;
      }

      console.log(
        `
NOTE if not using dockers:
1. Go to the test-suite/certs directory and run generate.sh
2. To run the https tests, you will need to install trusted certificates onto your machine.
   --> On a mac, click on certs/fullchain.pem and add to your System certs and then set Trust to "Secure Sockets Layer" -> Always Trust
   --> On windows... lmgtfy?? sorry..
3. Add the following entries to /etc/hosts if running locally:

127.0.0.1      ${domains.main.hostname}
127.0.0.1      ${domains.subdomain.hostname}
127.0.0.1      ${domains.external.hostname}
127.0.0.1      ${process.env.TLS_DOMAIN || 'tls.ulixee-test.org'}

Run the suite:
4. Point your scraper at http://a1.ulixee-test.org:${directivesPort} to get your first instruction.
5. Follow the instruction, and then ask this same url for your next instruction. Instructions will be returned until the test suite is completed.`,
      );
    })
    .on('error', err => console.log(err));
})();
