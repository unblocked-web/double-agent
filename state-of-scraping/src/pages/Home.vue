<template lang="pug">
    .Home.Page
        .wrapper
            h1 A Detailed Analysis of Browser Detection Methods.
            .intro
                | This website is a compilation of various research projects at the #[a(href="https://dataliberationfoundation.org") Data Liberation Foundation].
                | We spent the last few years studying web browser automation and various techniques to block data
                | extraction on the web.
        ScraperBotOdds

        ScraperChecks

</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import ScraperBotOdds from '@/components/ScraperBotOdds.vue';
import ScraperChecks from '@/components/ScraperChecks.vue';

@Component({
  components: {
    ScraperBotOdds,
    ScraperChecks,
  },
})
export default class Home extends Vue {}
</script>

<style scoped lang="scss">
.App .Home {
  .wrapper {
    margin: 0 25%;
  }

  .intro {
    font-size: 18px;
    line-height: 25px;
    text-align: justify;
    text-shadow: 1px 1px 0 white;
  }
}
</style>
