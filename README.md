Double Agent is a suite of tools written to allow a scraper engine to test if it is detectable when trying to blend into the most common web traffic.

Each test suite measures ways to detect a specific part of a scraper stack. Most detection techniques presented compare a user agent’s browser and operating system to the capabilities detectable in a given page load.

Mostly, these tests detect when a user agent is not who it claims to be.

## Mainstream Scraper Detections:

This version of Double Agent tests how many ways popular scrapers can be detected when emulating the most common browser/OS desktop combos. Future versions will integrate mobile browsers.

As of January, 2020 [^1], the most popular US desktop browsers are (limited to > 5% share):

Browser | Market Share
--- | :---:
Chrome 79 | 42.2%
Safari 13 | 11.1%
Edge 18 | 7.8%
Chrome 80 | 7%
Firefox 72 | 5.1%
Total | 73.2%

US Operating System market share is (limited to > 3% share):

OS | Market Share
---  | :---:
Windows 10 | 50.2%
OS X Catalina | 11.7%
Windows 7 | 10.4%
OS X Mojave | 6.2%
OS X High Sierra | 3.2%
Total | 81.7%

[^1]: stats from [StatCounter.com](https://gs.statcounter.com/)

#### Detections

Counts shown are the number of ways to detect each scraper agent per test suite emulating browsers with the Operating Systems shown above.

Scraper | Chrome 79 | Safari 13 | Edge 18 | Chrome 80 | Firefox 72
--- |  :---: | :---: | :---: | :---: | :---: 
[Node.js 12 - http/https](docs/scraper-detections/node_12.md) | [246](docs/scraper-detections/node_12.md#chrome-79)| [247](docs/scraper-detections/node_12.md#safari-13)| [248](docs/scraper-detections/node_12.md#edge-18)| [251](docs/scraper-detections/node_12.md#chrome-80)| [250](docs/scraper-detections/node_12.md#firefox-72)
[Curl](docs/scraper-detections/curl.md) | [245](docs/scraper-detections/curl.md#chrome-79)| [237](docs/scraper-detections/curl.md#safari-13)| [239](docs/scraper-detections/curl.md#edge-18)| [245](docs/scraper-detections/curl.md#chrome-80)| [241](docs/scraper-detections/curl.md#firefox-72)
[Scrapy 1.8](docs/scraper-detections/scrapy_1_8.md) | [235](docs/scraper-detections/scrapy_1_8.md#chrome-79)| [203](docs/scraper-detections/scrapy_1_8.md#safari-13)| [207](docs/scraper-detections/scrapy_1_8.md#edge-18)| [237](docs/scraper-detections/scrapy_1_8.md#chrome-80)| [209](docs/scraper-detections/scrapy_1_8.md#firefox-72)
[Puppeteer 2.0 - Chromium 79](docs/scraper-detections/puppeteer_2_0.md) | [55](docs/scraper-detections/puppeteer_2_0.md#chrome-79)| [95](docs/scraper-detections/puppeteer_2_0.md#safari-13)| [117](docs/scraper-detections/puppeteer_2_0.md#edge-18)| [55](docs/scraper-detections/puppeteer_2_0.md#chrome-80)| [99](docs/scraper-detections/puppeteer_2_0.md#firefox-72)
[Puppeteer 2.0 - Chromium 79 + Incognito Mode](docs/scraper-detections/puppeteer_2_0_incognito.md) | [55](docs/scraper-detections/puppeteer_2_0_incognito.md#chrome-79)| [95](docs/scraper-detections/puppeteer_2_0_incognito.md#safari-13)| [117](docs/scraper-detections/puppeteer_2_0_incognito.md#edge-18)| [55](docs/scraper-detections/puppeteer_2_0_incognito.md#chrome-80)| [99](docs/scraper-detections/puppeteer_2_0_incognito.md#firefox-72)
[Puppeteer 2.1 - Chromium 80](docs/scraper-detections/puppeteer_2_1.md) | [44](docs/scraper-detections/puppeteer_2_1.md#chrome-79)| [98](docs/scraper-detections/puppeteer_2_1.md#safari-13)| [101](docs/scraper-detections/puppeteer_2_1.md#edge-18)| [35](docs/scraper-detections/puppeteer_2_1.md#chrome-80)| [99](docs/scraper-detections/puppeteer_2_1.md#firefox-72)
[Puppeteer 2.1 - Chrome 80](docs/scraper-detections/puppeteer_2_1_chrome.md) | [37](docs/scraper-detections/puppeteer_2_1_chrome.md#chrome-79)| [98](docs/scraper-detections/puppeteer_2_1_chrome.md#safari-13)| [101](docs/scraper-detections/puppeteer_2_1_chrome.md#edge-18)| [28](docs/scraper-detections/puppeteer_2_1_chrome.md#chrome-80)| [99](docs/scraper-detections/puppeteer_2_1_chrome.md#firefox-72)

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
