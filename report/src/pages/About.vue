<template lang="pug">
    .About.Page
        .wrapper
            h1 About State of Scraping

            .box
                p
                    | This website compiles findings from efforts at the Data Liberation Foundation to explore methods for
                    | blocking bot detection.

                h3 Browsers (and often Individual Versions) have Unique Properties
                p
                    | Findings are calculated by examining properties of browser agents navigating a simple website (using #[a(href="https://browserstack.com") BrowserStack]).
                    | Browser versions often show different properties for various layers of an HTTP request, like http headers, cookie support, TLS handshakes, browser features, etc.
                    br
                    br
                    | Many of these properties are consistent enough that they can be used to determine if a user agent is being impersonated (like a bot).
                    | These detectable differences are the focus of this report.
                    br
                    br
                    | Default properties of various browsers and scrapers have been collated in the #[a(href="https://github.com/ulixee/double-agent") Double Agent]
                    | project on github.

                h3 Who We Are
                p
                    | The #[a(href="https://dataliberationfoundation.org") Data Liberation Foundation] is a non-profit organization whose mission is to allow all
                    | developers to easily access the world's public data.
                    br
                    br
                    | We are the makers of:
                    ul
                        li #[a(href="https://ulixee.org") Ulixee] - a universal "data as a service" API combining scraped data and databases
                        li Secret Agent - an undetectable automated browser intended for scraping
                        li #[a(href="https://github.com/ulixee/double-agent") Double Agent] - a comprehensive bot detection suite


</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component({
  components: {},
})
export default class About extends Vue {}
</script>

<style scoped lang="scss">
.About {
  padding-top: 50px;
  p {
    font-size: 18px;
    line-height: 26px;
  }
}
</style>
