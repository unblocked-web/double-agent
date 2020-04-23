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