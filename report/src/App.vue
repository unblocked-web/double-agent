<template lang="pug">
  .App
    .box
      navbar
      router-view.view
      footerbar
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Navbar from '@/components/Navbar.vue'; // @ is an alias to /src
import Footerbar from '@/components/Footerbar.vue'; // @ is an alias to /src

@Component({
  components: {
    Navbar,
    Footerbar,
  },
})
export default class App extends Vue {}
</script>

<style lang="scss">
@import 'styles/common.scss';
@import 'styles/application.scss';

</style>
