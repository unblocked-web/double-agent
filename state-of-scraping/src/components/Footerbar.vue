<template lang="pug">
  .Footerbar
    .legal
      .copyright
        CreativeCommons.creative-commons
        .long All content is available for reuse under #[a(href='https://creativecommons.org/licenses/by/4.0/') Creative Commons 4.0 International license]; because knowledge deserves to be free.
        .short #[a(href='https://creativecommons.org/licenses/by/4.0/') Creative Commons License]
</template>

<script lang="ts">
import { Component, Watch, Vue } from 'vue-property-decorator';
import CreativeCommons from '@/assets/creative-commons.svg';

@Component({
  components: {
    CreativeCommons,
  },
})
export default class Footerbar extends Vue {}
</script>

<style lang="scss">
.Footerbar {
  background: #f0f3f4;
  border-top: 1px solid #dadada;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: inset 1px 1px 0 white;
  text-align: left;
  padding: 10px 0 10px;
  line-height: 15px;
  margin: 55px 1px 1px;
  height: 20px;

  .legal {
    margin-top: 0;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.4);
    box-sizing: border-box;
    padding: 0 25px;
    display: table;
    width: 100%;

    a {
      opacity: 0.5;
    }
  }

  .creative-commons {
    height: 15px;
    margin-right: 5px;
    opacity: 0.3;
  }

  .long {
    display: inline;
  }

  .short {
    display: none;
  }
}

@media (max-width: 1000px) {
  .Footerbar {
    padding: 0 30px;
  }
  .legal {
    padding: 0;
    font-size: 13px;
  }
  .copyright {
    margin: 35px 0 0;
  }
}

@media (max-width: 600px) {
  .long {
    display: none;
  }
  .short {
    display: inline;
  }

  .Footerbar {
    padding: 0 20px;
  }
}
</style>
