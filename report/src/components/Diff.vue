<template lang="pug">
    .diff
        template(v-if="value === undefined && expected")
            .part.label No Value Provided, Expected:
            .part.missing {{expected}}
        template(v-else)
            template(v-if="expected === undefined")
                .part.label Value Provided
                .part.default {{value || '[none]'}}
            template(v-else)
                .parts(:class="{ list: showAsList}")
                    .part(v-for="part in parts" :class="{ missing: part.removed, extra: part.added }") {{part.value}}

</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';
import { diffArrays, diffWords } from 'diff';

@Component({
  components: {},
})
export default class Diff extends Vue {
  @Prop({})
  private value!: string;
  @Prop()
  private expected!: string;
  @Prop({ default: true })
  private showAsList!: boolean;

  get parts() {
    const value = this.value;
    const expected = this.expected;

    if (this.showAsList) {
      return diffArrays(String(expected).split(','), String(value).split(','))
        .map(x => {
          return x.value.map(y => ({
            value: y,
            added: x.added,
            removed: x.removed,
          }));
        })
        .flat();
    } else if (String(expected).match(/^[\d,]+$/g)) {
      return [
        { value: String(value), added: true, removed: false },
        { value: ' expected ' + String(expected), removed: true, added: false },
      ];
    } else {
      return diffWords(String(expected), String(value));
    }
  }
}
</script>

<style lang="scss">
.diff {
  h5 {
    margin: 0;
  }
  pre,
  .parts {
    white-space: pre-wrap;
  }
  .list .part {
    display: block;
  }
  .part {
    font-size: 0.8em;
    color: #777777;
    margin-left: 1px;
    text-overflow: ellipsis;
    display: inline-block;
    overflow-wrap: break-word;
    max-width: 100%;
    &.label {
      color: black;
      margin-right: 5px;
    }
    &.default {
      color: #3f576a;
    }
    &.extra {
      color: #008000;
    }
    &.missing {
      color: #ff000a;
    }
  }
}
</style>
