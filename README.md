Double agent is a suite of tools for detecting the end to end stack of web interactions in order to detect when a 
user agent is not who they are claiming to be.

A suite of tools written to allow a scraper engine to test if it is detectable. This suite is intended to be able to 
score the stealth features of a given scraper stack. Most detection techniques presented compare a user agent’s browser 
and operating system to the capabilities detectable in a given page load.

Mostly, these tests detect when a user agent is not who it claims to be.

# Results:
The following table shows our test results of how well a few popular scraping frameworks perform at emulation of the 
following browsers and operating systems:
- Chrome 70 - 80
- Firefox 65 - 72
- Edge 17, 18
- Operating Systems: 
    - Windows 7, 8.1, 10
    - Mac OS X 10.10 - 10.15


# Structure:
This suite is broken into layers of detection. Some of these layers can be used on their own to detect a user agent who 
does not appear who it says it is, but most of these utilities would be combined to determine a “score” of bot-likelihood 
by a detection system.

- tls <link>
  - clienthello - looks at the tls handshake and compares to the proposed user agent OS
- tcp <link>
  - ttl - looks at the tcp packets and compares to the user agent OS
- http <link>
  - headers - compares header order, capitalization and default values to the normal user agent values
  - cookies - are cookies enabled, are same-site and other cookies correctly sent
  - loaded assets - does a request load expected assets? (css, images, ad networks)
- browser <link>
  - javascript - simple test if javascript is enabled
  - features - test that the list of browser features matches the user agent
  - fonts - does the font fingerprint match the operating system
  - audio codecs - test that the audio codecs match the given user agent
  - video codecs - test that the video codecs match the given user agent
  - overrides - detect when features have been overridden to simulate a real browser
  - fingerprints - is the browser fingerprint the same on every execution?
  - vm detection - side channel timing red pill to detect the use of a vm
- user <link>
  - mouse movement - does the mouse exhibit movement (scrolling, clicking, movement)
  - pattern - recording of order of exact steps performed (pages loaded, mouse movements/clicks, element interaction, typing)
  - load-to-interact - measure time from assets received to interact with page

# Getting Started:


# License
MIT
