<template lang="pug">
  .Navbar.Component
    .columns
      .column.logo
        router-link(to='/').logo-large: Logo
      .column.nav-icon
        .icon-box(@click='toggleMenu'): Hamburger
      .column.nav(@click.self='hideMenu' :class='{ open: menuIsOpen }')
        .nav-groups
          .nav-group.pages
            ul
              li.mobile: router-link(to='/' @click.native='toTop') Home
              li.spacer
              li: router-link(to='/benchmarks' @click.native='toTop') Benchmarks
              li.spacer
              li: router-link(to='/about' @click.native='toTop') About
              li.spacer
          .nav-group.social
             ul
                li.github
                    a.icon-box(href='https://github.com/ulixee/double-agent'): Github

</template>

<script lang="ts">
import { Component, Watch, Vue } from 'vue-property-decorator';
import Logo from '@/assets/logo.svg';
import Hamburger from '@/assets/hamburger.svg';
import Github from '@/assets/github.svg';

@Component({
  components: {
    Logo,
    Hamburger,
    Github,
  },
})
export default class Navbar extends Vue {
  public menuIsOpen: boolean = false;

  @Watch('$route', { immediate: true, deep: true })
  public onUrlChange() {
    this.menuIsOpen = false;
  }

  public toggleMenu() {
    this.menuIsOpen = !this.menuIsOpen;
  }

  public toTop() {
    this.hideMenu();
    window.scrollTo(0, 0);
  }

  public hideMenu() {
    this.menuIsOpen = false;
  }
}
</script>

<style scoped lang="scss">
.Navbar {
  position: relative;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: 0;
}
.columns {
  display: table;
  width: 100%;
  padding-top: 5px;
}
.column {
  white-space: nowrap;
  display: table-cell;
  vertical-align: middle;
  box-sizing: border-box;
  height: 95px;
  &.logo {
    border-right: 1px solid rgba(0, 0, 0, 0.1);
    width: 20%;
    box-sizing: border-box;
    padding: 3px 25px 0 40px;
    text-align: left;
    svg {
      height: 25px;
      margin: 0;
    }
    &:hover {
      opacity: 0.8;
    }
  }
  &.nav-icon {
    width: 1%;
    padding-right: 30px;
    display: none;
    .icon-box {
      height: 25px;
      width: 25px;
      margin-left: auto;
      border-radius: 5px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      cursor: pointer;
      text-align: center;
    }
    svg {
      width: 18px;
      vertical-align: middle;
    }
  }
  &.nav {
    width: 80%;
  }
  &.nav.open {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    border-left: black;
    z-index: 100;
    width: 100%;
    background: rgba(0, 0, 0, 0.2);
    .nav-groups {
      display: block;
      box-shadow: -1px 0 1px rgba(0, 0, 0, 0.2);
      background: white;
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      width: 80%;
    }
    .nav-group {
      display: block;
      &.pages {
        height: auto;
        width: auto;
        border-right: none;
        ul,
        li {
          display: block;
          text-align: left;
        }
        li {
          width: auto;
          padding: 0;
          margin-left: 10px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        a {
          display: block;
          padding: 11px 0 9px;
          &:after {
            display: none;
          }
          &:hover {
            background: #f8faff;
            border-bottom: none;
          }
        }
        li.mobile {
          display: block;
        }
        li.spacer {
          display: none;
        }
      }
      &.social {
        width: 200px;
        max-width: 100%;
        li a {
          margin: 0;
        }
      }
      li a.router-link-active:before {
        display: none;
      }
    }
  }
  .logo-small {
    position: absolute;
    left: 25px;
    top: 5px;
    font-size: 18px;
    font-weight: 900;
  }
}
.nav-groups {
  display: table;
  width: 100%;
}
.nav-group {
  white-space: nowrap;
  display: table-cell;
  vertical-align: middle;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  height: 100px;
  padding-top: 3px;
  &.pages {
    width: 75%;
    height: 100px;
    padding: 0;
    ul {
      width: 100%;
      display: table;
    }
    li {
      text-align: center;
      display: table-cell;
      padding: 0;
      color: #607fcb;
    }
    li.mobile {
      display: none;
    }
    li.spacer {
      width: 20%;
      min-width: 10px;
    }
    li.divider {
      height: 1px;
      background: rgba(0, 0, 0, 0.1);
    }
    a,
    a:hover,
    a:active,
    a:focus {
      position: relative;
      outline: 0;
    }
    a:hover {
      text-decoration: none;
      border-bottom: 1px solid rgba(96, 127, 203, 0.3);
    }
    a.router-link-active {
      &:before {
        content: '';
        position: absolute;
        left: 50%;
        bottom: -8px;
        margin-left: -15px;
        width: 0;
        height: 0;
        border-style: solid;
        border-width: 7px 15px 0 15px;
        border-color: rgba(96, 127, 203, 0.4) transparent transparent transparent;
      }
      &:after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: -7px;
        margin-left: -15px;
        width: 0;
        height: 0;
        border-style: solid;
        border-width: 7px 15px 0 15px;
        border-color: white transparent transparent transparent;
      }
    }
  }
  &.social {
    width: 25%;
    padding: 0 50px 0 30px;
    border-right: none;
    ul {
      width: 100%;
      display: table;
    }
    li {
      margin: 0;
      width: 25%;
      text-align: center;
      display: table-cell;
    }
    .icon-box {
      display: block;
      margin: 0 auto;
      width: 28px;
      height: 28px;
      padding: 2px;
      text-align: center;
      border-radius: 20px;
      &:hover {
        background: #344a7f;
        text-decoration: none;
        svg {
          path {
            fill: white;
          }
        }
      }
    }
    svg {
      width: 100%;
      height: 100%;
      path {
        fill: black;
      }
    }
  }
}
ul {
  list-style-type: none;
  padding: 0;
  text-align: right;
  li {
    display: inline-block;
  }
}

button {
  border-radius: 3px;
  padding: 1px 10px 3px;
  line-height: 1em;
  font-size: 14px;
  height: 22px;
  position: relative;
  top: -1px;
  background: linear-gradient(to bottom, #eaeef1 0%, #e2e6e9 100%);
  border: 1px solid #9fb3d2;
  color: rgba(0, 0, 0, 0.7);
  &:hover {
    text-shadow: 1px 1px 0 white;
  }
}
@media (max-width: 900px) {
  .Navbar {
    padding: 0;
  }
  .column.logo {
    padding-left: 25px;
    width: 100%;
  }
  .column.nav-icon {
    display: table-cell;
  }
  .column.nav {
    display: none;
    &.open {
      display: block;
    }
  }
  .column:first-child {
    border-right: none;
  }
  .nav-group.social {
    padding-right: 30px;
  }
}
@media (max-width: 600px) {
  .column.logo {
    padding-left: 18px;
  }
  .column.nav-icon {
    padding-right: 20px;
  }
}
</style>
