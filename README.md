Double Agent is a suite of tools for detecting the end to end stack of web interactions in order to detect when a
user agent is not who they are claiming to be.

A suite of tools written to allow a scraper engine to test if it is detectable. This suite is intended to be able to
score the stealth features of a given scraper stack. Most detection techniques presented compare a user agent’s browser
and operating system to the capabilities detectable in a given page load.

Mostly, these tests detect when a user agent is not who it claims to be.

## Mainstream Scraper Detections:

The following table shows our test results of how many ways popular scraping frameworks can be detected when emulating the
following browsers and operating systems:

- Chrome 70 - 80
- Firefox 65 - 72
- Edge 17, 18
- Operating Systems: Windows 7, 8.1, 10; Mac OS X 10.10 - 10.15

#### Detections

Counts shown are the number of ways to detect each scraper agent per test suite.

Detection | Tests | [Curl](docs/scraper-detections/curl.md) | [Scrapy](docs/scraper-detections/scrapy.md) | [Puppeteer](docs/scraper-detections/puppeteer.md)
--- | :---: | :---: | :---: | :---: 
TCP Layer | 6 | [3](docs/scraper-detections/curl.md#tcp-layer) | [3](docs/scraper-detections/scrapy.md#tcp-layer) | [3](docs/scraper-detections/puppeteer.md#tcp-layer)
TLS Initial Handshake | 6 | [6](docs/scraper-detections/curl.md#tls-initial-handshake) | [6](docs/scraper-detections/scrapy.md#tls-initial-handshake) | [6](docs/scraper-detections/puppeteer.md#tls-initial-handshake)
TLS Grease Used | 6 | [3](docs/scraper-detections/curl.md#tls-grease-used) | [3](docs/scraper-detections/scrapy.md#tls-grease-used) | [3](docs/scraper-detections/puppeteer.md#tls-grease-used)
Can Set Cookies | 40 | [24](docs/scraper-detections/curl.md#can-set-cookies) | [20](docs/scraper-detections/scrapy.md#can-set-cookies) | [0](docs/scraper-detections/puppeteer.md#can-set-cookies)
Same Site Cookies | 12 | [12](docs/scraper-detections/curl.md#same-site-cookies) | [12](docs/scraper-detections/scrapy.md#same-site-cookies) | [0](docs/scraper-detections/puppeteer.md#same-site-cookies)
Secure Cookies | 8 | [6](docs/scraper-detections/curl.md#secure-cookies) | [8](docs/scraper-detections/scrapy.md#secure-cookies) | [0](docs/scraper-detections/puppeteer.md#secure-cookies)
Cross Domain Cookies | 16 | [16](docs/scraper-detections/curl.md#cross-domain-cookies) | [16](docs/scraper-detections/scrapy.md#cross-domain-cookies) | [8](docs/scraper-detections/puppeteer.md#cross-domain-cookies)
Standard Http Headers | 150 | [90](docs/scraper-detections/curl.md#standard-http-headers) | [88](docs/scraper-detections/scrapy.md#standard-http-headers) | [45](docs/scraper-detections/puppeteer.md#standard-http-headers)
Standard Https Headers | 150 | [105](docs/scraper-detections/curl.md#standard-https-headers) | [103](docs/scraper-detections/scrapy.md#standard-https-headers) | [75](docs/scraper-detections/puppeteer.md#standard-https-headers)
Asset Headers | 2,805 | [2,805](docs/scraper-detections/curl.md#asset-headers) | [1,785](docs/scraper-detections/scrapy.md#asset-headers) | [792](docs/scraper-detections/puppeteer.md#asset-headers)
Xhr Headers | 3,465 | [3,465](docs/scraper-detections/curl.md#xhr-headers) | [3,465](docs/scraper-detections/scrapy.md#xhr-headers) | [624](docs/scraper-detections/puppeteer.md#xhr-headers)
Cors Preflight Headers | 540 | [540](docs/scraper-detections/curl.md#cors-preflight-headers) | [540](docs/scraper-detections/scrapy.md#cors-preflight-headers) | [184](docs/scraper-detections/puppeteer.md#cors-preflight-headers)
Websocket Headers | 990 | [990](docs/scraper-detections/curl.md#websocket-headers) | [990](docs/scraper-detections/scrapy.md#websocket-headers) | [306](docs/scraper-detections/puppeteer.md#websocket-headers)
Audio Codecs Supported | 18 | [18](docs/scraper-detections/curl.md#audio-codecs-supported) | [18](docs/scraper-detections/scrapy.md#audio-codecs-supported) | [16](docs/scraper-detections/puppeteer.md#audio-codecs-supported)
Video Codecs Supported | 18 | [18](docs/scraper-detections/curl.md#video-codecs-supported) | [18](docs/scraper-detections/scrapy.md#video-codecs-supported) | [18](docs/scraper-detections/puppeteer.md#video-codecs-supported)
WebRTC Audio Codecs Supported | 6 | [6](docs/scraper-detections/curl.md#webrtc-audio-codecs-supported) | [6](docs/scraper-detections/scrapy.md#webrtc-audio-codecs-supported) | [4](docs/scraper-detections/puppeteer.md#webrtc-audio-codecs-supported)
WebRTC Video Codecs Supported | 6 | [6](docs/scraper-detections/curl.md#webrtc-video-codecs-supported) | [6](docs/scraper-detections/scrapy.md#webrtc-video-codecs-supported) | [6](docs/scraper-detections/puppeteer.md#webrtc-video-codecs-supported)
Cache Headers | 
Loads All Page Assets | 
Sec Navigate Header | 
Referrers | 
Dom Features Match Version | 
Browser Fingerprint | 
Fonts Fingerprint | 
Is Javascript Enabled? | 
EMCA Support Matches Browser | 
Dom Features Tampered With | 
Virtual Machine Used | 
Repeated Interaction Steps | 
Time to Interact with Page | 
Mouse Movement | 

## Structure:

This suite is broken into layers of detection. Some of these layers can be used on their own to detect a user agent who
does not appear who it says it is, but most of these utilities would be combined to determine a “score” of bot-likelihood
by a detection system.

- `/detections`: suite of tests
- `/runner`: a server that can generate step-by-step instructions for a scraper to run all tests
- `/scrapers`: some default scraping stacks running the suite

## Detections:

The list of detections is listed below (some tests are not yet implemented):

Module | Detections | Description | Implemented
--- | --- | --- | :---:
tcp/ttl | * TCP Layer | Compares tcp packet values to the user agent OS | :white_check_mark:
tls/clienthello | * TLS Initial Handshake<br/><br/>* TLS Grease Used | Looks at the tls handshake and compares to the proposed user agent OS | :white_check_mark:
http/cookies | * Can Set Cookies<br/><br/>* Same Site Cookies<br/><br/>* Secure Cookies<br/><br/>* Cross Domain Cookies | Are cookies enabled? Are same-site, secure and other cookies correctly sent? | :white_check_mark:
http/headers | * Standard Http Headers<br/><br/>* Standard Https Headers<br/><br/>* Asset Headers<br/><br/>* Xhr Headers<br/><br/>* Cors Preflight Headers<br/><br/>* Websocket Headers | Compares header order, capitalization and default values to normal (recorded) user agent values | :white_check_mark:
browser/codecs | * Audio Codecs Supported<br/><br/>* Video Codecs Supported<br/><br/>* WebRTC Audio Codecs Supported<br/><br/>* WebRTC Video Codecs Supported | Test that the audio, video and WebRTC codecs match the given user agent | :white_check_mark:
http/cache | * Cache Headers | Http caching headers sent in different conditions vs default user agent behavior |  
http/loaded-assets | * Loads All Page Assets | Does a request load expected assets? (css, images, ad networks) |  
http/navigate | * Sec Navigate Header | Looks at SEC- http headers for user initiated navigation and referrers |  
http/referrers | * Referrers | Referrer headers indicate browser came from a legitimate source |  
browser/features | * Dom Features Match Version | Test that the list of browser features matches the user agent |  
browser/fingerprint | * Browser Fingerprint | Is the browser fingerprint the same on every execution? |  
browser/fonts | * Fonts Fingerprint | Does the font fingerprint match the operating system |  
browser/javascript | * Is Javascript Enabled?<br/><br/>* EMCA Support Matches Browser | Tests that javascript is enabled and has all/only EMCA features expected |  
browser/tampering | * Dom Features Tampered With | Detect when features have been tampered with to simulate a real browser |  
browser/vm | * Virtual Machine Used | Detect when a browser is running in a VM |  
user/interaction | * Repeated Interaction Steps<br/><br/>* Time to Interact with Page | Recording of order of exact steps performed (pages loaded, mouse movements/clicks, element interaction, typing) |  
user/mouse | * Mouse Movement | Does the mouse move (scrolling, clicking, movement)? |  

## Testing your Scraper Stack:

This project leverages yarn workspaces. To get started, run `yarn` from the root directory.

If you'd like to test out your scraper stack:

1. Navigate to the `/runner` directory and run `yarn start`.

2. The API at `http://localhost:3000` will return directives one at a time until all tests have been run. Include a scraper engine you're testing with
   a query string or header called "scraper". Directive format can be found at `/runner/lib/IDirective.ts`.

3. Once all tests are run, results will be output to the same directory as your scraper engine.

4. Run `yarn analyze` to see final results compared to other popular scrapers

You can run tests in the detections directory individually by navigating to directories and following directions after
booting servers using `yarn start`.

Popular scraper examples can be found in the `/scrapers` directory.
