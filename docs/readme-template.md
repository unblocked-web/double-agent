Double Agent is a suite of tools written to allow a scraper engine to test if it is detectable when trying to blend into the most common web traffic.

## Structure:

DoubleAgent has been organized into two main layers:
 
- `/collect`: scripts/plugins for collecting browser profiles. Each plugin generates a series of pages to test how a browser behaves.
- `/analyze`: scripts/plugins for analyzing browser profiles against verified profiles. Scraper results from `collect` are compared to legit "profiles" to find discrepancies. These checks are given a Looks Human"&trade; score, which indicates the likelihood that a scraper would be flagged as bot or human.
 
The easiest way to use `collect` is with the collect-controller:
- `/collect-controller`: a server that can generate step-by-step assignments for a scraper to run all tests

## Plugins

The bulk of the `collect` and `analyze` logic has been organized into what we call plugins.

### Collect Plugins
{{inject=output/collect-plugins.md}}

### Analyze Plugins

{{inject=output/analyze-plugins.md}}

## Scraper Results:

For a dynamic approach to exploring results, visit [ScraperReport](https://scraper.report).

## Testing your Scraper:

This project leverages yarn workspaces. To get started, run `yarn` from the root directory.

If you'd like to test out your scraper stack:

1. Navigate to the `/collect-controller` directory and run `yarn start`. Follow setup directions print onto the console from this command. 

2. The API will return assignments one at a time until all tests have been run. Include a scraper engine you're testing with
   a query string or header called "scraper". Assignment format can be found at `/collect-controller/interfaces/IAssignment.ts`.

3. Once all tests are run, results will be output to the same directory as your scraper engine.

Popular scraper examples can be found in the [scraper-report](https://github.com/ulixee/scraper-report) repo.
