<template lang="pug">
    .Stat(:class="getClasses()") {{value}}{{marker}}
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';

@Component({
  components: {},
})
export default class Stat extends Vue {
  @Prop({})
  private value!: number;
  @Prop({ default: 80 })
  private failThreshold!: number;
  @Prop({ default: 20 })
  private passThreshold!: number;

  @Prop({ type: Boolean })
  private skipColor!: boolean;

  @Prop({ default: '' })
  private marker?: string;

  getClasses() {
    const count = this.value;
    if (this.skipColor) return {};
    return {
      fail: count >= this.failThreshold,
      pass: count < this.passThreshold,
    };
  }
}
</script>

<style lang="scss">
.Stat {
  font-weight: bold;
  font-size: 1.5em;
  line-height: 1.2em;
  vertical-align: middle;
  color: #777777;
  text-align: center;

  &.pass {
    color: #008000;
  }
  &.fail {
    color: #ff000a;
  }
}
</style>
