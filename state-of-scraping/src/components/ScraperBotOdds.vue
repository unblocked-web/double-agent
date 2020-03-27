<template lang="pug">
    .ScraperBotOdds.box
        h2 Likelihood of Scraping Toolset Detection
        #customize-scraper
            #period-chooser
                | Scraped Pages in 10 Minutes
                vue-slider(v-model="requestsPerPeriod"
                    dragOnClick=true
                    :min=10
                    :max=500
                    tooltip="always"
                    tooltip-placement="right")
            .customizeLink
                a(v-if="!customizeScraper" href="#" @click.prevent="customizeScraper = true") Customize Scraper
                a(v-else href="#" @click.prevent="customizeScraper = false") Done
            #customize-scraper-options(:class="{ showing: customizeScraper }")
                .box
                    #rotate-ip.radioBlock
                        .sectionHeader Customize IP Address
                        .sameIpBlock
                            input(type="radio" name="rotateIP" id="radio-same-ip" v-bind:value="false" v-model="rotateIP")
                            label(for="radio-same-ip") Same IP per Scrape
                        .rotateIpBlock
                            input(type="radio" name="rotateIP" id="radio-rotate-ip" v-bind:value="true" v-model="rotateIP")
                            label(for="radio-rotate-ip") New VPN/Proxy per Scrape
                    #agents.radioBlock
                        .sectionHeader Customize User Agents
                        .intoli-agents
                            input(type="radio" name="agentsType" value="intoli" id="radio-intoli" v-model="agentsType")
                            label(for="radio-intoli") Use a User Agent Generator (#[a(href="https://github.com/intoli/user-agents" target="new") intoli])
                        .statcounter-agents
                            input(type="radio" name="agentsType" value="statcounter" id="radio-statcounter" v-model="agentsType")
                            label(for="radio-statcounter") Rotate Between the Top 2 Browsers (per #[a(href="https://gs.statcounter.com/browser-version-market-share/desktop/north-america/" target="new") statcounter])

        table.scrapers
            thead
                tr
                    th
                    th.scoreDisclaimer(colspan=2) Bot Scores (max 100)
                tr
                    th(style="text-align:right")
                    th#chance-of-bot-title(style="width: 150px") Basic
                    th#chance-of-bot-title-super(style="width: 150px") Kitchen Sink
                    th(style="width: 50px")
            tbody
                tr.botScoreRow(v-for="(score,scraper) in botScores"  @click.prevent="toggleScraperBotDetails(scraper)" :class="{ open: showingTip === scraper }")
                    td.scraper {{scraper}}
                    td.botScore
                        Stat(:value="basicBotScores[scraper]")
                    td.botScore
                        Stat(:value="score")
                    td.more
                        v-popover(trigger="manual" delay=100 handleResize=true placement="left" hideOnTargetClick=true :open="showingTip === scraper" :popperOptions="popperOptions" offset="5")
                            .showMore(class="tooltip-target") why?
                            template(slot="popover")
                                h4 Bot Scores by Category
                                table.botScorePopover
                                    thead
                                        tr
                                            th
                                            th Basic
                                            th KS
                                    tr(v-for="score in botScoresByCategory[scraper]")
                                        td.category {{score.category}}
                                        td
                                            Stat(:value="basicBotScoresByCategory[scraper][score.category]")
                                        td
                                            Stat(:value="score.botPct")
            tfoot
                tr
                    th
                    th
                    th
                        a(v-if="!customizeKitchenSink" href="#" @click.prevent="customizeKitchenSink = true") customize
                        a(v-if="customizeKitchenSink" href="#" @click.prevent="customizeKitchenSink = false") done

        form#customize-tests(@change="updateScores()" v-if="customizeKitchenSink")
            .box
                .sectionHeader Customize the Kitchen Sink Tests
                .links
                    a(v-if="isSelectAll" href="#" @click.prevent="selectAll") select all
                    a(v-else href="#" @click.prevent="clearSelected") select none
                ul.categories
                    li(v-for="item in categoriesAndLayers")
                        h5(v-if="item.isLayer") {{item.title}}
                        div(v-else)
                            input(:id="item.title" :value="item.title" name="category" type="checkbox" v-model="selectedCategories")
                            label(:for="item.title") {{item.title}}

</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import Stat from '@/components/Stat.vue';
import VueSlider from 'vue-slider-component';
import { categories, scrapers } from '../data';
import browserWeightedBotScore from '@double-agent/runner/lib/browserWeightedBotScore';

@Component({
  components: {
    Stat,
    VueSlider,
  },
})
export default class ScraperBotOdds extends Vue {
  private agentsType: 'intoli' | 'statcounter' = 'intoli';
  private rotateIP = false;
  private selectedCategories: string[] = [];
  private basicCategories: string[] = ['IP Address', 'User Agent'];

  private customizeKitchenSink = false;
  private readonly categoriesAndLayers: {
    title: string;
    isLayer: boolean;
    implemented: boolean;
  }[] = [];
  private botScores: { [scraper: string]: number } = {};
  private botScoresByCategory: { [scraper: string]: { category: string; botPct: number }[] } = {};
  private basicBotScores: { [scraper: string]: number } = {};
  private basicBotScoresByCategory: {
    [scraper: string]: { [category: string]: number };
  } = {};
  private requestsPerPeriod = 10;
  private isSelectAll = false;
  private customizeScraper = false;
  private popperOptions = {
    modifiers: { flip: { enabled: false } },
    padding: { top: 50, bottom: 50 },
  };
  private showingTip: string = '';

  private requestSliderValues = [10, 100, 1000];
  private updateScoreTimeout: any;

  get agentTypeOptions() {
    return [
      {
        code: 'intoli',
        label: 'Use a Generator (intoli user-agents)',
      },
      {
        code: 'statcounter',
        label: 'Only use the top 2 User Agents (per statcounter)',
      },
    ];
  }

  constructor() {
    super();
    for (const [category, entry] of Object.entries(categories)) {
      const layerTitle = `${entry.layer.toUpperCase()}`;
      if (!this.categoriesAndLayers.some(x => x.title === layerTitle && x.isLayer)) {
        this.categoriesAndLayers.push({
          title: layerTitle,
          isLayer: true,
          implemented: true,
        });
      }

      this.categoriesAndLayers.push({
        title: category,
        isLayer: false,
        implemented: entry.implemented,
      });
      this.selectedCategories.push(category);
    }
  }

  toggleScraperBotDetails(scraper: string) {
    if (this.showingTip === scraper) this.showingTip = '';
    else this.showingTip = scraper;
  }

  clearSelected() {
    this.selectedCategories.length = 0;
    this.updateScores();
    this.isSelectAll = true;
  }

  selectAll() {
    for (const cat of this.categoriesAndLayers.filter(x => !x.isLayer)) {
      if (!this.selectedCategories.includes(cat.title)) this.selectedCategories.push(cat.title);
    }
    this.updateScores();
    this.isSelectAll = false;
  }

  created() {
    this.updateScores();
  }

  @Watch('requestsPerPeriod')
  debounceUpdateScores() {
    if (this.updateScoreTimeout) clearTimeout(this.updateScoreTimeout);
    this.updateScoreTimeout = setTimeout(() => {
      this.updateScores();
    }, 50);
  }

  @Watch('rotateIP')
  @Watch('agentsType')
  updateScores() {
    const activeCategories = this.selectedCategories.filter(category =>
      this.categoriesAndLayers.some(x => !x.isLayer && x.title === category && x.implemented),
    );
    for (const [, scraper] of Object.entries(scrapers)) {
      const scores = browserWeightedBotScore(
        scraper,
        activeCategories,
        this.agentsType,
        this.rotateIP,
        this.requestsPerPeriod,
      );
      this.botScores[scraper.title] = scores.botScore;
      this.botScoresByCategory[scraper.title] = scores.categoryScores;

      const basicScores = browserWeightedBotScore(
        scraper,
        this.basicCategories,
        this.agentsType,
        this.rotateIP,
        this.requestsPerPeriod,
      );
      this.basicBotScores[scraper.title] = basicScores.botScore;
      this.basicBotScoresByCategory[scraper.title] = {};
      for (const entry of basicScores.categoryScores) {
        if (!this.botScoresByCategory[scraper.title].find(x => x.category === entry.category)) {
          this.botScoresByCategory[scraper.title].unshift({
            category: entry.category,
            botPct: undefined as any,
          });
        }
        this.basicBotScoresByCategory[scraper.title][entry.category] = entry.botPct;
      }
    }
    this.$forceUpdate();
  }
}
</script>

<style lang="scss">
@import '~vue-slider-component/lib/theme/antd.scss';
@import '~vue-select/src/scss/vue-select.scss';
.popover {
  h4 {
    margin: 0 0 5px;
    padding-bottom: 5px;
    text-align: center;
    border-bottom: 1px solid #dddddd;
  }
}
.botScorePopover {
  font-size: 1em;
  width: 100%;

  .Stat {
    font-size: 1em;
  }

  .category {
    white-space: nowrap;
    padding-right: 20px;
  }
}
</style>
<style scoped lang="scss">
@import '../styles/resets.scss';
@import '../styles/application.scss';

.ScraperBotOdds {
  margin: 55px 10% 1px;

  h2 {
    text-align: center;
  }

  .subtext {
    font-size: 15px;
    text-align: center;
    font-style: italic;
    margin: 15px auto;
  }

  table.scrapers {
    width: 100%;
    border-collapse: collapse;
    tfoot th {
      text-align: center;
      line-height: 25px;
      font-size: 0.8em;
      font-weight: normal;
    }
    thead th {
      text-transform: uppercase;
      font-size: 13px;
      font-style: italic;
      text-align: center;
      line-height: 25px;

      &.scoreDisclaimer {
        font-size: 0.8em;
        opacity: 0.8;
      }
    }
    .botScoreRow {
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
      &.open,
      .open {
        background-color: #f2f2f2;
        .showMore {
          opacity: 1;
        }
      }
      .botScore {
        position: relative;
      }
    }
  }

  h3 {
    margin-top: 30px;
    padding-bottom: 10px;
    border-bottom: 1px solid darkgrey;
  }

  #customize-scraper {
    margin: 0 10px 15px;

    #footer-options {
      > div {
        display: inline-block;
        width: 50%;
        padding: 10px;
        box-sizing: border-box;
        vertical-align: top;
      }
    }
    .customizeLink {
      font-size: 0.8em;
      text-align: right;
    }

    #period-chooser {
      font-size: 0.9em;
      font-style: italic;
      margin: 5px 0 10px;
      text-transform: uppercase;
      .vue-slider {
        margin-top: 5px;
      }
    }

    #customize-scraper-options {
      display: none;
      box-sizing: border-box;
      .box {
        padding: 20px;
        background-color: #eeeeee;
        margin-top: 5px;
      }
      &.showing {
        display: block;
      }
      .radioBlock {
        display: inline-block;
        width: 50%;
        > div {
          margin-bottom: 5px;
        }
        input {
          margin-right: 5px;
        }

        .sectionHeader {
          margin-bottom: 8px;
        }
      }
    }
  }
  .sectionHeader {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 5px;
  }
  #customize-tests {
    .box {
      padding: 20px;
      background-color: #eeeeee;
      margin-top: 5px;
    }
    .links {
      font-size: 0.9em;
      margin: 5px auto;
    }
    .info {
      font-style: italic;
      font-size: 0.9em;
      color: #5a5a5a;
      text-align: center;
    }

    .categories {
      -moz-column-count: 3;
      -moz-column-gap: 10px;
      -webkit-column-count: 3;
      -webkit-column-gap: 10px;
      column-count: 3;
      column-gap: 10px;
      @include reset-ul();
      li {
        h5 {
          margin: 0;
          line-height: 25px;
        }
        min-height: 25px;
        input {
          margin-right: 8px;
        }
      }
    }

    > div {
      margin-top: 20px;
    }
  }
}
</style>
