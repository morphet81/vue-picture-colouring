# Vue Picture Colouring

This library is intenteded for colouring and stick stickers on pictures. When you color parts of your image that are transparent, the transparency information is kept so that you can colourize objects without going beyond their limits. Also works for stickers: if you try to put a sticker in a transparent area, it will not appear.

You can change the main layer image without overwriting the colouring that has been made until then.

**WARNING** For now this library is made only for mobile phones and touch events. Will evolve later.

## Installation

NPM
```bash
npm install vue-picture-colouring
```

Yarn
```bash
yarn add vue-picture-colouring
```

# Usage

Import the package and declare your component

```javascript
// Import Vue Picture Colouring
import vpcImage from 'vue-picture-colouring'

export default {
    name: {
        'home-page'
    },
    components: {
        vpcImage          // Declare the component
    }
}
```

Then put the ```vpc-image``` component wherever you need and use properties listed below to setup your colouring image.

```html
<vpc-image></vpc-image>
```

You can make a snapshot using the ```snapshot``` method of the component. The method will return a base64 string.

First, give a reference to the component
```html
<vpc-image ref="colouring"></vpc-image>
```

Then where you need it
```javascript
let snapBase64 = this.$refs.colouring.snapshot()
```

# Colour or Sticker?

The tool will paint the given color unless a sticker URL is given. The touchmove event 

## Properties

|Property   |Role                                                                                                                                   |Default    |
|------------|---------------------------------------------------------------------------------------------------------------------------------------|-----------|
|src    |The main layer image, the one you will be able to colour and put stickers on|null|
|bw-src|The black and white version of the main layer image. This allow to colourize nicely without colours stacking above each others. This is useless if your main src is already black and white.|null|
|width|The width of the canvas<br>*Deprecated: Now uses the dimensions given to the component*|640|
|height|The height of the canvas<br>*Deprecated: Now uses the dimensions given to the component*|480|
|color|The color that is applied by the tool on the picture|'#dd3b3b'|
|tool-width|Painting tool width|18|
|sticker|The source URL of the sticker that is stuck on the picture|null|
|sticker-width|The width of the sticker|32|
|sticker-height|The height of the sticker|32|
|erase|Indicates if the tool is in erase mode|false|
|sub-layers|Images source URLs for elements to be displayed below the main layer. It is not possible to colour it but it will appear in the snapshot. They are displayed in the same order they are given (the first one backward)|[]|
|up-layers|Images source URLs for elements to be displayed above the main layer. It is not possible to colour it but it will appear in the snapshot. They are displayed in the same order they are given (the first one backward)|[]|
|zoom-level|Initial zoom level to be applied to the scene|1|
|rotation|Initial angle in degrees to be applied to the scene|0|
|canvas-ratio|Canvas scale ratio. This allows to improve final image resolution|2|

### *Licensing*
 *The icons used as stickers for the demo have been made by Freepik and were taken from [Flaticon website](https://www.flaticon.com/)*