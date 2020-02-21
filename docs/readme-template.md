Double Agent is a suite of tools written to allow a scraper engine to test if it is detectable. This suite is intended to be able to
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

{{inject=output/scraper-detection-results.md}}

## Structure:

This suite is broken into layers of detection. Some of these layers can be used on their own to detect a user agent who
does not appear who it says it is, but most of these utilities would be combined to determine a “score” of bot-likelihood
by a detection system.

- `/detections`: suite of tests
- `/runner`: a server that can generate step-by-step instructions for a scraper to run all tests
- `/scrapers`: some default scraping stacks running the suite

## Detections:

The list of detections is listed below (some tests are not yet implemented):

{{inject=output/detections.md}}

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
