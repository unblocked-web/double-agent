<template lang="pug">
  .ScraperBenchmark.Page
    .wrapper
      h1 Benchmark for {{scraper}}
      #emulator-block
        .inline-block.label Emulating
        .inline-block.select
          v-select#browser-select(:value="browserKey" :reduce="x => x.code" :clearable="false" :options="browsers" @input="browserChanged")

      template(v-if="session.id")
          .botCategory.box
              h3 Overall
              .labelValue.botScore
                .label Bot Score:
                .value
                    Stat(:value="botScore")

              .labelValue.checks
                .label Flagged:
                .value {{flags}} of {{checks}} bot checks

              .labelValue.notLoaded
                  .label Assets Not Loaded:
                  .value {{notLoaded}}

              .labelValue.notLoaded
                  .label Assets Types Not Loaded:
                  .value {{assetsNotLoadedTypes}}

          .botCategory.box(v-for="category in categoryKeys", :id="category | slug")
              h3 {{category}}

              .labelValue.botScore
                  .label Bot Score:
                  .value
                      Stat(:value="categoryBotScore(category)")

              .labelValue.checks
                  .label Flagged:
                  .value {{categoryFlagCount(category)}} of {{categoryChecks(category)}} bot checks

              template(v-if="categoryFlags(category)")
                  table
                    thead
                        tr
                            th(width="200px") Flagged Bot Check
                            th(width="150px") Resource
                            th(width="50%")
                                | Differences from Expected
                                .disclaimer
                                    span.extra green = extra
                                    span.missing red = missing
                            th.botScoreHeader(width="100px") Bot Score
                    tbody
                        tr(v-for="(flag, index) in categoryFlags(category)" v-tooltip="flag.description" v-if="index <= checksToLoad")
                            td {{flag.checkName}}
                            td.resource {{flag.secureDomain ? 'Secure' : 'Http'}} {{flag.resourceType}}
                            td.expected
                                Diff(:value="flag.value" :expected="flag.expected" :showAsList="showFlagAsList(flag)")
                            td
                                Stat(:value="flag.pctBot")
                        tr(v-if="categoryFlags(category).length > checksToLoad")
                            td#loadMore(colspan=4 align=center)
                                a(@click.prevent="checksToLoad += 20" href="#") Load 20 of {{categoryFlags(category).length-checksToLoad}} more
      div.waiting(v-else) Loading


</template>

<script lang="ts">
import { categories, scrapers } from '../data';
import pako from 'pako';
import Stat from '@/components/Stat.vue';
import Diff from '@/components/Diff.vue';
import { Component, Prop, Vue } from 'vue-property-decorator';
import IDetectionSession from '@double-agent/runner/interfaces/IDetectionSession';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';
import { json } from '../../../../ulixee/shared/types';

@Component({
  components: {
    Stat,
    Diff,
  },
})
export default class ScraperBenchmark extends Vue {
  @Prop()
  private scraperKey!: string;
  @Prop()
  private browserKey!: string;

  private checksToLoad = 50;
  private botScore = 0;
  private categoryBotScores: { [category: string]: number } = {};
  private categoryCheckCounts: { [category: string]: number } = {};

  private get checks() {
    return Object.values(this.categoryCheckCounts).reduce((a, b) => a + b, 0);
  }

  private get flags() {
    return (this.session.flaggedChecks ?? []).length;
  }

  private get assetsNotLoadedTypes() {
    const types: string[] = [];
    for (const asset of this.session.assetsNotLoaded ?? []) {
      if (!types.includes(asset.resourceType.toString())) types.push(asset.resourceType.toString());
    }
    return types.join(', ');
  }

  private get notLoaded() {
    return (this.session.assetsNotLoaded ?? []).length;
  }

  private session: IDetectionSession = {} as IDetectionSession;

  private flagsByCategory: { [category: string]: IFlaggedCheck[] } = {};

  categoryFlags(category: string) {
    return this.flagsByCategory[category];
  }

  categoryBotScore(category: string) {
    return this.categoryBotScores[category] ?? 0;
  }

  categoryFlagCount(category: string) {
    return this.flagsByCategory[category]?.length ?? 0;
  }

  categoryChecks(category: string) {
    return this.categoryCheckCounts[category] ?? 0;
  }

  private categoryKeys = Object.keys(categories).filter(x => categories[x].implemented);
  private categories = categories;

  get scraper() {
    return scrapers[this.scraperKey].title;
  }

  get browser() {
    return this.titleCase(this.browserKey);
  }

  get browsers() {
    const findings = scrapers[this.scraperKey].browserFindings;
    return Object.keys(findings)
      .map(x => ({
        code: x,
        label: this.titleCase(x),
      }))
      .sort((a, b) => {
        return a.label.localeCompare(b.label);
      });
  }

  showFlagAsList(flag: IFlaggedCheck) {
    return (
      flag.category?.includes('Cookie') ||
      flag.category?.includes('Codecs') ||
      flag.checkName === 'Headers in Correct Order'
    );
  }
  async mounted() {
    this.loadBenchmarkData();
  }

  loadBenchmarkData() {
    this.$http
      .get(
        process.env.VUE_APP_DATA_HOST +
          `/scrapers/${this.scraperKey}/sessions/${this.browserKey}.json.gz`,
        { responseType: 'arraybuffer' },
      )
      .then(x => {
        const jsonBody = pako.ungzip((x as any).body, { to: 'string' });
        return JSON.parse(jsonBody);
      })
      .then((session: any) => {
        let botScore = 0;
        const flagsByCategory: { [category: string]: IFlaggedCheck[] } = {};
        const categoryChecks: { [category: string]: number } = {};
        const categoryBotScores: { [category: string]: number } = {};
        for (const flag of session.flaggedChecks ?? []) {
          const category = flag.category;
          if (!flagsByCategory[category]) {
            flagsByCategory[category] = [];
            categoryBotScores[category] = 0;
          }

          const flags = flagsByCategory[category];
          // too many to traverse
          if (category === 'Dom Features Match Version') {
            flags.push(flag);
          } else if (!flags.some(x => x.checkName === flag.checkName && x.value === flag.value)) {
            flags.push(flag);
          }
          if (flag.pctBot > botScore) {
            botScore = flag.pctBot;
          }
          if (flag.pctBot > categoryBotScores[category]) {
            categoryBotScores[category] = flag.pctBot;
          }
        }

        for (const check of session.checks) {
          if (!categoryChecks[check.category]) categoryChecks[check.category] = 0;
          categoryChecks[check.category] += check.count;
        }

        this.botScore = botScore;
        this.flagsByCategory = flagsByCategory;
        this.categoryCheckCounts = categoryChecks;
        this.categoryBotScores = categoryBotScores;
        this.session = session || {};

        const hash = document.location.hash;
        if (hash) {
          setTimeout(() => {
            const elem = document.querySelector(hash);
            if (elem) {
              elem.scrollIntoView({
                behavior: 'smooth',
              });
            }
          }, 100);
        }
      });
  }

  browserChanged(browserKey) {
    this.$router.push({
      name: 'scraperBenchmark',
      params: {
        scraperKey: this.scraperKey,
        browserKey,
      },
    });
    this.session = {} as IDetectionSession;
    this.loadBenchmarkData();
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

.ScraperBenchmark.Page {
  .box {
    padding: 30px;
    box-sizing: border-box;
  }
  #emulator-block {
    font-size: 1.2em;
    margin: 10px 20% 30px;
    .inline-block {
      display: inline-block;
      &.label {
        width: 20%;
      }
      &.select {
        background-color: white;
        width: 80%;
      }
    }
  }

  .notLoaded .types {
    font-size: 0.9em;
    font-style: italic;
    margin-left: 10px;
  }

  .labelValue {
    font-size: 0.97em;
    .label,
    .value {
      display: inline-block;
      margin-top: 5px;
    }
    .Stat {
      font-size: 1em;
    }
    .label {
      margin-right: 5px;
      color: black;
    }
    .value {
      font-size: 0.95em;
    }
  }
  .flagCount {
    font-style: italic;
    font-size: 0.9em;
  }

  h3 {
    margin-top: 0;
  }

  h3,
  p,
  h5 {
    text-align: left;
    margin-bottom: 10px;
  }

  table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    background-color: white;
    font-size: 0.9em;
    line-height: 25px;
    margin: 15px 0;
    border: 1px solid rgba(176, 180, 184, 0.3);
    tr {
      border-top: 1px solid rgba(176, 180, 184, 0.3);
    }
    td,
    th {
      padding: 3px 5px;
      vertical-align: top;
      text-align: left;
      &.botScoreHeader {
        text-align: center;
      }
      .disclaimer {
        display: inline-block;
        margin-left: 10px;
        font-size: 0.9em;
        line-height: 0.9em;
        margin-top: -2px;
        font-weight: normal;
        .extra {
          color: #008000;
          margin-right: 5px;
        }
        .missing {
          color: #ff000a;
        }
      }
      .diff {
        font-size: 15px;
        line-height: 18px;
        font-family: 'Avenir', Helvetica, Arial, sans-serif;
      }
      .diff pre,
      .part {
        font-family: 'Avenir', Helvetica, Arial, sans-serif;
      }
    }
  }
  .waiting {
    display: inline-block;
    width: 40px;
    height: 40px;
    &:after {
      content: ' ';
      display: block;
      width: 30px;
      height: 30px;
      margin: 8px;
      border-radius: 50%;
      border: 6px solid #f0f3f4;
      border-color: #f0f3f4 transparent #f0f3f4 transparent;
      animation: waiting 1.2s linear infinite;
    }
  }
  @keyframes waiting {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
}
</style>
