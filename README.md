Double Agent is a suite of tools written to allow a scraper engine to test if it is detectable when trying to blend into the most common web traffic.

Each test suite measures ways to detect a specific part of a scraper stack. Most detection techniques presented compare a user agent’s browser and operating system to the capabilities detectable in a given page load.

Mostly, these tests detect when a user agent is not who it claims to be.

## Mainstream Scraper Detections:

This version of Double Agent tests how many ways scrapers can be detected when emulating browser/OS desktop combos. Future versions will integrate mobile browsers.

Scrapers often choose a strategy of rotating user agents using a library, or picking a few popular browsers and rotating between those. This suite tests both strategies.

1. **Intoli:** randomly generated useragents using the Intoli [user-agents](https://github.com/intoli/user-agents) package
2. **Majority:** rotate between the useragents that comprise more than 50% of web traffic according to [StatCounter.com](https://gs.statcounter.com/)

For a dynamic approach to exploring results, visit [State of Scraping](https://stateofscraping.org).

## Structure:

This suite is broken up by the layers of a browser request. Each layer has one or more plugins that tie into an overall set of pages loaded by a test runner. Each plugin first generates "profiles" of how known browsers behave loading the test pages. Any scraper is then compared to these "profiles" to find discrepancies. These checks are given a "bot score", or likelihood that the flagged check indicates the user agent is actually a bot.

- `/detections`: suite of tests
- `/runner`: a server that can generate step-by-step assignments for a scraper to run all tests
- `/profiler`: create profiles of real browsers running through the pages 

## Detections:

The list of detections is listed below (some tests are not yet implemented):

Module | Detections | Description | Implemented
--- | --- | --- | :---:
tcp/ttl | * TCP Layer | Compares tcp packet values to the user agent OS | :white_check_mark:
tls/clienthello | * TLS Handshake<br/><br/>* TLS Grease Used | Looks at the tls handshake and compares to the proposed user agent OS | :white_check_mark:
ip/address | * IP Address | Checks remote ip addresses and port ranges | :white_check_mark:
http/cookies | * Cookie Support<br/><br/>* Secure Cookies<br/><br/>* Same Site Cookies<br/><br/>* Same Origin Cookies<br/><br/>* Cross Site Cookies | Are cookies enabled? Are same-site, secure and other cookies correctly sent? | :white_check_mark:
http/headers | * Standard Http Headers<br/><br/>* Standard Https Headers<br/><br/>* Asset Headers<br/><br/>* Xhr Headers<br/><br/>* Cors Preflight Headers<br/><br/>* Websocket Headers | Compares header order, capitalization and default values to normal (recorded) user agent values | :white_check_mark:
http/loaded-assets | * Loads All Page Assets | Does a request load expected assets? (css, images, ad networks) | :white_check_mark:
http/user-agent | * User Agent | Checks how common a user agent is | :white_check_mark:
browser/codecs | * Audio Codecs Supported<br/><br/>* Video Codecs Supported<br/><br/>* WebRTC Audio Codecs Supported<br/><br/>* WebRTC Video Codecs Supported | Test that the audio, video and WebRTC codecs match the given user agent | :white_check_mark:
browser/dom | * Dom Features Match Version | Test that the list of browser dom features matches the user agent | :white_check_mark:
browser/fingerprint | * Browser Fingerprint | Is the browser fingerprint the same on every execution? | :white_check_mark:
browser/fonts | * Fonts Supported | Does the font fingerprint match the operating system | :white_check_mark:
browser/window-keys | * Window Keys Match Version | Test that the list of browser window keys match the user agent | :white_check_mark:
visits/over-time | * Hits Per Second<br/><br/>* Hits Per Minute<br/><br/>* Hits Per Hour | Checks counts of hits from the same user agent buckets | :white_check_mark:
http/cache | * Cache Headers | Http caching headers sent in different conditions vs default user agent behavior |  
http/referrers | * Referrers | Referrer headers indicate browser came from a legitimate source |  
browser/javascript | * Is Javascript Enabled?<br/><br/>* EMCA Support Matches Browser | Tests that javascript is enabled and has all/only EMCA features expected |  
browser/render | * Browser Rendering | Detect nuances and capabilities for each browser rendering engine |  
browser/tampering | * Dom Features Tampered With | Detect when features have been tampered with to simulate a real browser |  
browser/vm | * Virtual Machine Used | Detect when a browser is running in a VM |  
browser/webgl | * WebGl Parameters | Detect webGL graphics card and capabilities |  
user/interaction | * Time Between User Actions<br/><br/>* Time to Interact with Page<br/><br/>* Repeated Interaction Steps | Recording of order of exact steps performed (pages loaded, mouse movements/clicks, element interaction, typing) |  
user/mouse | * Mouse Movement | Does the mouse move (scrolling, clicking, movement)? |  

## Testing your Scraper Stack:

This project leverages yarn workspaces. To get started, run `yarn` from the root directory.

If you'd like to test out your scraper stack:

1. Navigate to the `/runner` directory and run `yarn start`. Follow setup directions print onto the console from this command. 

2. The API will return assignments one at a time until all tests have been run. Include a scraper engine you're testing with
   a query string or header called "scraper". Assignment format can be found at `/runner/interfaces/IAssignment.ts`.

3. Once all tests are run, results will be output to the same directory as your scraper engine.

Popular scraper examples can be found in the [scraper-report](https://github.com/ulixee/scraper-report) repo.
