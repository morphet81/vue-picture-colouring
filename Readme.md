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

## Usage

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

You can make a snapshot using the ```snapshot``` method of the component. The method will return a base64 data URL by defaul.

Pass ```false``` as a first argument to snapshot without transformations and pass ```1``` as a second argument to get a blob image.

First, give a reference to the component
```html
<vpc-image ref="colouring"></vpc-image>
```

Then where you need it
```javascript
let snapBase64 = this.$refs.colouring.snapshot()
```

You can also take a snapshot without applying the visible rotation and scale. This is useful if you wish to reuse the drawing result as the sub or up layer of another drawing in which transformations will be changed.
```javascript
let snapBase64 = this.$refs.colouring.snapshot(false)
```

## Colour or Sticker?

The tool will paint the given color unless a sticker URL is given. The touchmove event 

## Sublayers and Uplayers

Sublalyers and Uplayers are objects giving information for drawing layer below or above your main layer. They can have 2 different natures.

### Image element

It will be inserted as an image. Just give the ```src``` and indicate if transformations you gave for the scene should be applied to this layer.

```
{
    src: 'path/to/image',
    transform: true|false,
}
```

### Canvas element

It will insert a ```canvas``` element that is a clone of the canvas you give in the object. The ```zoomLevel``` and ```rotation`` you give for this canvas is the original transformation you applied on this layer. The idea is to allow you to use a ```vue-picture-colouring``` canvas that you previously created as a layer of the current canvas you are colouring.

```json
{
    canvas: canvas element,
    zoomLevel: zoom level,
    rotation: rotation value,
}
```

## Force colouring pixels

It can be useful to force colouring the pixels of you picture, for example when you need to save the state of your drawing to reload it later. To do so you can use the ```setColouredPixels``` method:

```javascript
let colouredPixels = ['here is a list of your pixels']
this.$refs.colouring.setColouredPixels(colouredPixels)
```

The list of coloured pixels should be the pixel size of the canvas (width * height) and contain either null (is no color applied) or a pixel structure as follow:
```javascript
{
    red: 128,               // Red value
    green: 128,             // Green value
    blue: 128,              // Blue value
    sticker: true|false     // Is it a pixel for drawing a sticker or not ?
}
```

You can easily save the current coloured pixels list using the ```cloneColouredPixels``` method.

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
|sub-layers|Layers to be displayed below the main layer. It is not possible to colour it but it will appear in the snapshot. They are displayed in the same order they are given (the first one backward)|[]|
|up-layers|Layers to be displayed above the main layer. It is not possible to colour it but it will appear in the snapshot. They are displayed in the same order they are given (the first one backward)|[]|
|zoom-level|Initial zoom level to be applied to the scene|1|
|rotation|Initial angle in degrees to be applied to the scene|0|
|canvas-ratio|Canvas scale ratio. This allows to improve final image resolution|2|

## Events

__initialized__

When initialization is finished. This will occure either at page load or after calling the ```clear``` method.

__refresh-start__

When the canvas is being refreshed after a change of main layer.

__refresh-end__

When the canvas has been refreshed after a change a main layer.


### *Licensing*
 *The icons used as stickers for the demo have been made by Freepik and were taken from [Flaticon website](https://www.flaticon.com/)*