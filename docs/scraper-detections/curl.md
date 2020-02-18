# Curl Detections

## TCP Layer
Compares tcp packet values to the user agent OS

User Agent | Tests | Inconsistency Detected | Flagged (not Called) | Failed Tests
--- | :---: | :---: | :---: | ---
Overall | 6 | 3 | 0 |
Linux | 2 | 1 | 0 | - Packet WindowSize<br/>
Windows | 2 | 2 | 0 | - Packet TTL<br/>- Packet WindowSize<br/>
Mac OS X | 2 | 0 | 0 | 

## Tls Clienthello
Looks at the tls handshake and compares to the proposed user agent OS

### TLS Initial Handshake

User Agent | Tests | Inconsistency Detected | Flagged (not Called) | Failed Tests
--- | :---: | :---: | :---: | ---
Overall | 6 | 6 | 0 |
Chrome 70 | 1 | 1 | 0 | - TLS Fingerprint Match<br/>
Chrome 71 | 1 | 1 | 0 | - TLS Fingerprint Match<br/>
Chrome 80 | 1 | 1 | 0 | - TLS Fingerprint Match<br/>
Firefox 72 | 2 | 2 | 0 | - TLS Fingerprint Match<br/>
Edge 18 | 1 | 1 | 0 | - TLS Fingerprint Match<br/>
### TLS Grease Used

User Agent | Tests | Inconsistency Detected | Flagged (not Called) | Failed Tests
--- | :---: | :---: | :---: | ---
Overall | 6 | 3 | 0 |
Chrome 70 | 1 | 1 | 0 | - TLS Grease in ClientHello<br/>
Chrome 71 | 1 | 1 | 0 | - TLS Grease in ClientHello<br/>
Chrome 80 | 1 | 1 | 0 | - TLS Grease in ClientHello<br/>
Firefox 72 | 2 | 0 | 0 | 
Edge 18 | 1 | 0 | 0 | 

## Http Headers
Compares header order, capitalization and default values to normal (recorded) user agent values

### Standard Http Headers

User Agent | Tests | Inconsistency Detected | Flagged (not Called) | Failed Tests
--- | :---: | :---: | :---: | ---
Overall | 150 | 90 | 0 |
Chrome 70 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 71 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 72 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 73 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 74 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 75 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 76 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 77 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 78 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 79 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 80 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Firefox 65 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Firefox 72 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Edge 17 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Edge 18 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
### Standard Https Headers

User Agent | Tests | Inconsistency Detected | Flagged (not Called) | Failed Tests
--- | :---: | :---: | :---: | ---
Overall | 150 | 105 | 0 |
Chrome 70 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 71 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 72 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 73 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 74 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 75 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 76 | 10 | 9 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Sec-Fetch-Mode<br/>- Document - Header has a Browser Default Value for: Sec-Fetch-Site<br/>- Document - Header has a Browser Default Value for: Sec-Fetch-User<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 77 | 10 | 9 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Sec-Fetch-Mode<br/>- Document - Header has a Browser Default Value for: Sec-Fetch-Site<br/>- Document - Header has a Browser Default Value for: Sec-Fetch-User<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 78 | 10 | 9 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Sec-Fetch-Mode<br/>- Document - Header has a Browser Default Value for: Sec-Fetch-Site<br/>- Document - Header has a Browser Default Value for: Sec-Fetch-User<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 79 | 10 | 9 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Sec-Fetch-Mode<br/>- Document - Header has a Browser Default Value for: Sec-Fetch-Site<br/>- Document - Header has a Browser Default Value for: Sec-Fetch-User<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Chrome 80 | 10 | 9 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Sec-Fetch-Mode<br/>- Document - Header has a Browser Default Value for: Sec-Fetch-Site<br/>- Document - Header has a Browser Default Value for: Sec-Fetch-User<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Firefox 65 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Firefox 72 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Edge 17 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
Edge 18 | 10 | 6 | 0 | - Document - Default Headers in Order + Casing<br/>- Document - Header has a Browser Default Value for: Accept<br/>- Document - Header has a Browser Default Value for: Accept-Encoding<br/>- Document - Header has a Browser Default Value for: Accept-Language<br/>- Document - Header has a Browser Default Value for: Connection<br/>- Document - Header has a Browser Default Value for: Upgrade-Insecure-Requests<br/>
### Asset Headers

User Agent | Tests | Inconsistency Detected | Flagged (not Called) | Failed Tests
--- | :---: | :---: | :---: | ---
Overall | 2,805 | 0 | 2,805 |
Chrome 70 | 187 | 0 | 187 | 
Chrome 71 | 187 | 0 | 187 | 
Chrome 72 | 187 | 0 | 187 | 
Chrome 73 | 187 | 0 | 187 | 
Chrome 74 | 187 | 0 | 187 | 
Chrome 75 | 187 | 0 | 187 | 
Chrome 76 | 187 | 0 | 187 | 
Chrome 77 | 187 | 0 | 187 | 
Chrome 78 | 187 | 0 | 187 | 
Chrome 79 | 187 | 0 | 187 | 
Chrome 80 | 187 | 0 | 187 | 
Firefox 65 | 187 | 0 | 187 | 
Firefox 72 | 187 | 0 | 187 | 
Edge 17 | 187 | 0 | 187 | 
Edge 18 | 187 | 0 | 187 | 
### Xhr Headers

User Agent | Tests | Inconsistency Detected | Flagged (not Called) | Failed Tests
--- | :---: | :---: | :---: | ---
Overall | 3,465 | 0 | 3,465 |
Chrome 70 | 231 | 0 | 231 | 
Chrome 71 | 231 | 0 | 231 | 
Chrome 72 | 231 | 0 | 231 | 
Chrome 73 | 231 | 0 | 231 | 
Chrome 74 | 231 | 0 | 231 | 
Chrome 75 | 231 | 0 | 231 | 
Chrome 76 | 231 | 0 | 231 | 
Chrome 77 | 231 | 0 | 231 | 
Chrome 78 | 231 | 0 | 231 | 
Chrome 79 | 231 | 0 | 231 | 
Chrome 80 | 231 | 0 | 231 | 
Firefox 65 | 231 | 0 | 231 | 
Firefox 72 | 231 | 0 | 231 | 
Edge 17 | 231 | 0 | 231 | 
Edge 18 | 231 | 0 | 231 | 
### Cors Preflight Headers

User Agent | Tests | Inconsistency Detected | Flagged (not Called) | Failed Tests
--- | :---: | :---: | :---: | ---
Overall | 540 | 0 | 540 |
Chrome 70 | 36 | 0 | 36 | 
Chrome 71 | 36 | 0 | 36 | 
Chrome 72 | 36 | 0 | 36 | 
Chrome 73 | 36 | 0 | 36 | 
Chrome 74 | 36 | 0 | 36 | 
Chrome 75 | 36 | 0 | 36 | 
Chrome 76 | 36 | 0 | 36 | 
Chrome 77 | 36 | 0 | 36 | 
Chrome 78 | 36 | 0 | 36 | 
Chrome 79 | 36 | 0 | 36 | 
Chrome 80 | 36 | 0 | 36 | 
Firefox 65 | 36 | 0 | 36 | 
Firefox 72 | 36 | 0 | 36 | 
Edge 17 | 36 | 0 | 36 | 
Edge 18 | 36 | 0 | 36 | 
### Websocket Headers

User Agent | Tests | Inconsistency Detected | Flagged (not Called) | Failed Tests
--- | :---: | :---: | :---: | ---
Overall | 990 | 0 | 990 |
Chrome 70 | 66 | 0 | 66 | 
Chrome 71 | 66 | 0 | 66 | 
Chrome 72 | 66 | 0 | 66 | 
Chrome 73 | 66 | 0 | 66 | 
Chrome 74 | 66 | 0 | 66 | 
Chrome 75 | 66 | 0 | 66 | 
Chrome 76 | 66 | 0 | 66 | 
Chrome 77 | 66 | 0 | 66 | 
Chrome 78 | 66 | 0 | 66 | 
Chrome 79 | 66 | 0 | 66 | 
Chrome 80 | 66 | 0 | 66 | 
Firefox 65 | 66 | 0 | 66 | 
Firefox 72 | 66 | 0 | 66 | 
Edge 17 | 66 | 0 | 66 | 
Edge 18 | 66 | 0 | 66 | 

## Browser Codecs
Test that the audio, video and WebRTC codecs match the given user agent

### Audio Codecs Supported

User Agent | Tests | Inconsistency Detected | Flagged (not Called) | Failed Tests
--- | :---: | :---: | :---: | ---
Overall | 18 | 0 | 18 |
Chrome 72 | 3 | 0 | 3 | 
Chrome 80 | 3 | 0 | 3 | 
Firefox 70 | 3 | 0 | 3 | 
Firefox 72 | 3 | 0 | 3 | 
Edge 18 | 3 | 0 | 3 | 
Firefox 69 | 3 | 0 | 3 | 
### Video Codecs Supported

User Agent | Tests | Inconsistency Detected | Flagged (not Called) | Failed Tests
--- | :---: | :---: | :---: | ---
Overall | 18 | 0 | 18 |
Chrome 72 | 3 | 0 | 3 | 
Chrome 80 | 3 | 0 | 3 | 
Firefox 70 | 3 | 0 | 3 | 
Firefox 72 | 3 | 0 | 3 | 
Edge 18 | 3 | 0 | 3 | 
Firefox 69 | 3 | 0 | 3 | 
### WebRTC Audio Codecs Supported

User Agent | Tests | Inconsistency Detected | Flagged (not Called) | Failed Tests
--- | :---: | :---: | :---: | ---
Overall | 6 | 0 | 6 |
Chrome 72 | 1 | 0 | 1 | 
Chrome 80 | 1 | 0 | 1 | 
Firefox 70 | 1 | 0 | 1 | 
Firefox 72 | 1 | 0 | 1 | 
Edge 18 | 1 | 0 | 1 | 
Firefox 69 | 1 | 0 | 1 | 
### WebRTC Video Codecs Supported

User Agent | Tests | Inconsistency Detected | Flagged (not Called) | Failed Tests
--- | :---: | :---: | :---: | ---
Overall | 6 | 0 | 6 |
Chrome 72 | 1 | 0 | 1 | 
Chrome 80 | 1 | 0 | 1 | 
Firefox 70 | 1 | 0 | 1 | 
Firefox 72 | 1 | 0 | 1 | 
Edge 18 | 1 | 0 | 1 | 
Firefox 69 | 1 | 0 | 1 | 