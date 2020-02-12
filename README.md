Double agent is a suite of tools for detecting the end to end stack of web interactions
in order to detect when a user agent is not who they are claiming to be.

This project is broken into the following:
## Detections: 
Different approaches to detecting behavior of a user agent
## Profiles:
Profiles represent the expected output/appearance of several well known   

### Spectrum of Detections
* TLS negotiation
    1. compression options sent
    2. ciphers sent
    3. Chrome uses BoringSSL - can we detect protocol diffs with openssl?
        1. yes, returns error code 0 consistently, openssl doesn't
        2. just look for grease, openssl doesn't support yet
    4. Http 1/2 alpn negotiation by agent
    5. SNI
* Tcp traffic:
    1. ttl headers different per os (https://subinsb.com/default-device-ttl-values/)
* Http Headers
    1. Capitalization and order match user agent
    2. Cors preflight headers
    3. Default headers per browser
    4. Timezone of request vs language settings
    5. Check web sockets + headers
* IP History:
    1. Check fingerprint against historical activity/flags
    2. Are ips in known data centers/vpns
* Browser environment:
    1. Javascript enabled
    2. Cookies work
    3. Feature detection in page vs user agent
    4. Is screen size/width possible given window size?
    5. What fonts are available?
    6. Codec detection (audio/video)
    7. Serialization of page items matches expected output against a normal browser
    8. Red pills: https://www.usenix.org/system/files/conference/woot14/woot14-ho.pdf
* Page assets loaded
    1. Are the expected assets loaded?
    2. If css, fonts and images are blocked, suspicious
* User interaction:
    1. Look for actions that are too fast, or too consistent a dwell time
    2. Look for mouse movement & scrolling
    3. Snapshot of steps. If exact same, flag it 
    4. Machine learning on regular activity?
