<template>
  <div id="app">
    <vic-image :color="colors[current]" :erase="erase" :toolWidth="26" :width="640*.7" :height="480*.7" class="vic-image" :src="require('./assets/watch-sketch-example.png')"></vic-image>
    <div class="colors">
      <div class="color-container" v-for="(color, i) in colors" :key="i">
        <div class="color" :style="colorStyle(i)" @click="onColorClick(i)"></div>
      </div>
      <div class="color-container">
        <div class="color" :style="eraserStyle" @click="erase = !erase">Eraser</div>
      </div>
    </div>
  </div>
</template>

<script>
import './components/index.js'

export default {
  name: 'app',
  data () {
    return {
      erase: false,
      current: 0,
      colors: [
        '#dd3b3b',
        '#3bdd58',
        '#3b76dd',
        '#c73bdd'
      ]
    }
  },
  computed: {
    eraserStyle () {
      return {
        'border': this.erase ? 'solid 4px black' : ''
      }
    }
  },
  methods: {
    colorStyle (index) {
      return {
        'background-color': this.colors[index],
        'border': !this.erase && this.current == index ? 'solid 4px black' : ''
      }
    },
    onColorClick (index) {
      this.current = index
      this.erase = false
    }
  }
}
</script>

<style>
#app {
  position: fixed;
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.vic-image {
  width: 100vw;
  height: 75vh;
}

.colors {
  display: flex;
  flex-direction: row;
}

.color-container {
  flex-grow: 1;
  display: flex;
  justify-content: center;
}

.color {
  width: 8vw;
  height: 12vh;
}
</style>
