<template lang="pug">
  .Benchmarks.Page
    .wrapper
      h1 Scraper Benchmarks

      .box
          table
            tbody
                tr(v-for="scraperKey in scraperKeys")
                    td.scraper {{getScraper(scraperKey).title}}
                    td.descrption {{getScraper(scraperKey).description}}
                    td.link(style="width: 70px")
                        router-link(:to="{ name:'scraperBenchmark', params:{scraperKey, browserKey: Object.keys(getScraper(scraperKey).browserFindings)[0]} }") show

</template>

<script lang="ts">
import { scrapers } from '@/data';
import { Component, Vue } from 'vue-property-decorator';

@Component({
  components: {},
})
export default class ScraperBenchmark extends Vue {
  get scraperKeys() {
    return Object.keys(scrapers);
  }

  getScraper(scraper: string) {
    return scrapers[scraper];
  }
}
</script>

<style lang="scss">
@import '~vue-select/src/scss/vue-select.scss';
</style>
<style scoped lang="scss">
@import '../styles/resets.scss';

.Benchmarks {
  .box {
    margin-top: 30px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    tr {
      height: 25px;
      border-bottom: 1px solid rgba(176, 180, 184, 0.87);
      &:last-child {
        border-bottom: 0 none;
      }
    }

    td {
      padding: 12px 5px;
      vertical-align: top;
      text-align: left;
      line-height: 20px;
      font-size: 1em;
      &.scraper {
        font-size: 1.1em;
        font-weight: 500;
        padding-right: 10px;
      }
      &.link {
        text-align: right;
      }
    }
  }
}
</style>
