Module | Detections | Description | Implemented
--- | --- | --- | :---:
tcp/ttl | * TCP Layer | Compares tcp packet values to the user agent OS | :white_check_mark:
tls/clienthello | * TLS Initial Handshake<br/><br/>* TLS Grease Used | Looks at the tls handshake and compares to the proposed user agent OS | :white_check_mark:
http/headers | * Standard Http Headers<br/><br/>* Standard Https Headers<br/><br/>* Asset Headers<br/><br/>* Xhr Headers<br/><br/>* Cors Preflight Headers<br/><br/>* Websocket Headers | Compares header order, capitalization and default values to normal (recorded) user agent values | :white_check_mark:
browser/codecs | * Audio Codecs Supported<br/><br/>* Video Codecs Supported<br/><br/>* WebRTC Audio Codecs Supported<br/><br/>* WebRTC Video Codecs Supported | Test that the audio, video and WebRTC codecs match the given user agent | :white_check_mark:
http/cache | * Cache Headers | Http caching headers sent in different conditions vs default user agent behavior |  
http/cookies | * Can Set Cookies<br/><br/>* Same Site Cookies<br/><br/>* Secure Cookies<br/><br/>* Cross Domain Cookies | Are cookies enabled, are same-site, secure and other cookies correctly sent? |  
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