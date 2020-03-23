<template lang="pug">
    .ScraperChecks.box
        h2 How Many Ways Can My Scraper Be Detected?

        #which.chooser
            .inline-block.label I'm Using
            .inline-block.select
                v-select#scraper-select(v-model="scraperKey" :reduce="x => x.code" :clearable="false" :options="scrapers" )
        #emulating.chooser
            .inline-block.label Emulating
            .inline-block.select
                v-select#browser-select(v-model="browserKey" :reduce="x => x.code"  :clearable="false" :options="browsers")

        .block.details-link
            router-link(:to="{ name: 'scraperBenchmark', params: {scraperKey, browserKey }}") Show Details

        table.browser-by-category
            thead
                tr
                    th
                    th(style="width:100px") Checks
                    th(style="width:100px") Failures
                    th(style="width:100px") Bot Score
                    th(style="width: 50px")
            tbody
                tr(v-for="item in categoriesAndLayers" :class="{ scoreRow: !item.isLayer }" @click.prevent="gotoBenchmark(item.slug)")
                    template(v-if="item.isLayer")
                        td.layer(colspan=4) {{item.title}}
                    template(v-else-if="!item.isImplemented")
                        td.category {{item.title}}
                        td
                            Stat(value='-', skip-color=true)
                        td
                            Stat(value='-', skip-color=true)
                        td
                            Stat(value='-', skip-color=true)
                        td
                    template(v-else)
                        td.category {{item.title}}
                        td
                            Stat(:value="safeFindings(item.title).checks", skip-color=true)
                        td
                            Stat(:value="safeFindings(item.title).flagged", fail-threshold=10, pass-threshold=3)
                        td
                            Stat(:value="safeFindings(item.title).botPct")
                        td
                            router-link.showMore(:to="{ name:'scraperBenchmark', params:{scraperKey, browserKey}, hash: '#' + item.slug }") details

</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Stat from '@/components/Stat.vue';
import slug from 'vue-string-filter/libs/slug';
import { categories, scrapers } from '../data';

@Component({
  components: {
    Stat,
  },
})
export default class ScraperChecks extends Vue {
  private scraperKey = '';
  private browserKey = '';
  private readonly categoriesAndLayers: {
    title: string;
    isLayer: boolean;
    isImplemented: boolean;
    slug: string;
  }[] = [];

  get findings() {
    return scrapers[this.scraperKey].browserFindings;
  }

  get browserFindings() {
    return this.findings[this.browserKey];
  }

  get scrapers() {
    return Object.keys(scrapers).map(x => ({
      code: x,
      label: scrapers[x].title,
    }));
  }

  get browsers() {
    return Object.keys(this.findings)
      .map(x => ({
        code: x,
        label: this.titleCase(x),
      }))
      .sort((a, b) => {
        return a.label.localeCompare(b.label);
      });
  }

  get scraper() {
    return scrapers[this.scraperKey].title;
  }

  get browser() {
    return this.titleCase(this.browserKey);
  }

  constructor() {
    super();
    for (const [category, entry] of Object.entries(categories)) {
      if (!this.categoriesAndLayers.some(x => x.title === entry.layer.toUpperCase() && x.isLayer)) {
        this.categoriesAndLayers.push({
          title: entry.layer.toUpperCase(),
          isLayer: true,
          isImplemented: true,
          slug: '',
        });
      }

      this.categoriesAndLayers.push({
        title: category,
        isLayer: false,
        isImplemented: entry.implemented,
        slug: slug(category),
      });
    }
  }

  gotoBenchmark(slug: string) {
    this.$router.push({
      name: 'scraperBenchmark',
      params: {
        scraperKey: this.scraperKey,
        browserKey: this.browserKey,
      },
      hash: '#' + slug,
    });
  }

  safeFindings(category: string) {
    return this.browserFindings[category] ?? { checks: 0, flagged: 0, botPct: 0 };
  }

  created() {
    this.scraperKey = Object.keys(scrapers)[0];
    this.browserKey = Object.keys(this.findings)[0];
  }

  capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  titleCase(str: string) {
    return str
      .split('__')
      .reverse()
      .map(this.capitalizeFirstLetter)
      .join(' on ')
      .replace(/_/g, ' ')
      .split(' ')
      .join(' ')
      .replace('Mac os x', 'Mac OS X')
      .replace(' 0 0', ' ')
      .replace(' 0', ' ')
      .replace(/(\d+)\s(\d+)/g, '$1.$2');
  }
}
</script>
<style lang="scss">
@import '~vue-select/src/scss/vue-select.scss';
</style>
<style scoped lang="scss">
@import '../styles/resets.scss';

.ScraperChecks {
  margin: 55px 10% 1px;

  h2 {
    text-align: center;
    margin-bottom: 30px;
  }
  h3 {
    font-size: 1.2em;
    text-align: left;
    margin: 15px auto;
  }
  .chosen {
    text-decoration: underline;
    margin-left: 5px;
  }
  .browser-by-category {
    @include reset-ul();
    margin-top: 25px;
  }

  .details-link {
    margin-top: 20px;
    text-align: center;
  }
  .chooser {
    width: 75%;
    margin: 5px auto;
    .inline-block {
      display: inline-block;
      &.label {
        width: 20%;
      }
      &.select {
        width: 80%;
      }
    }
  }

  table.browser-by-category {
    border-collapse: collapse;
    th {
      text-transform: uppercase;
      font-size: 13px;
      font-style: italic;
      text-align: center;
      line-height: 25px;
    }
    width: 100%;
    td.layer {
      padding-top: 10px;
      font-weight: bold;
      font-size: 0.8em;
    }
    tr.scoreRow {
      cursor: pointer;
      .showMore {
        opacity: 0.1;
        font-size: 0.9em;
      }
      &:hover {
        background-color: #fafafa;
        .showMore {
          opacity: 1;
        }
      }

      .botScore {
        position: relative;
      }
    }
  }
}
</style>
