<template>
  <div id="app">
    <vic-image class="vic-image" :style="imageStyle" :color="colors[currentColor]" :sticker="stickers[currentSticker]" 
      :erase="erase" :toolWidth="18" :width="width" :height="height" :src="require('./assets/watch-sketch-example.png')"
      :stickerWidth="stickerSize" :stickerHeight="stickerSize"></vic-image>
    <div class="colors">
      <div class="color-container" v-for="(color, i) in colors" :key="i">
        <div class="color" :style="colorStyle(i)" @click="onColorClick(i)"></div>
      </div>
      <div class="color-container">
        <div class="color eraser" :style="eraserStyle" @click="erase = !erase"></div>
      </div>
    </div>
    <div class="stickers">
      <div class="sticker-container" v-for="(sticker, i) in stickers" :key="i">
        <img class="sticker" :src="sticker" :style="stickerStyle(i)" @click="onStickerClick(i)"/>
      </div>
    </div>
  </div>
</template>

<script>
/* eslint-disable */
import './components/index.js'

export default {
  name: 'app',
  data () {
    return {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientWidth * 9 / 14,
      stickerSize: document.documentElement.clientWidth * 0.08,
      erase: false,
      currentColor: 0,
      currentSticker: null,
      colors: [
        '#dd3b3b',
        '#3bdd58',
        '#3b76dd',
        '#c73bdd'
      ],
      stickers: [
        require('./assets/stickers/bull.png'),
        require('./assets/stickers/chick.png'),
        require('./assets/stickers/crab.png'),
        require('./assets/stickers/fox.png'),
        require('./assets/stickers/hedgehog.png'),
        require('./assets/stickers/hippopotamus.png'),
        require('./assets/stickers/koala.png'),
        require('./assets/stickers/lemur.png'),
        require('./assets/stickers/pig.png'),
        require('./assets/stickers/tiger.png'),
        require('./assets/stickers/whale.png'),
        require('./assets/stickers/zebra.png'),
      ]
    }
  },
  computed: {
    imageStyle () {
      return {
        'height': `${this.height}px`
      }
    },
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
        'border': !this.erase && this.currentColor && this.currentColor == index ? 'solid 4px black' : ''
      }
    },
    stickerStyle (index) {
      return {
        'background-color': this.currentSticker && this.currentSticker == index ? 'blue' : '',
      }
    },
    onColorClick (index) {
      this.currentColor = index
      this.currentSticker = null
      this.erase = false
    },
    onStickerClick (index) {
      this.currentColor = null
      this.currentSticker = index
      this.erase = false
    }
  },
  mounted () {
  }
}
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
}

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
}

.colors {
  height: 12vh;
}

.colors, .stickers {
  margin-top: 2vh;
  display: flex;
  flex-direction: row;
}

.color-container, .sticker-container {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.color, .sticker {
  width: 8vw;
  height: 8vw;
}

.eraser {
  border: solid 0.5px black;
}
</style>
