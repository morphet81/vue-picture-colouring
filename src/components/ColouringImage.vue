<template>
    <div ref="vpcImage" class="vpc-image" @click="onClick" @touchstart="onTouchStart" @touchmove="onSwipe">
        <!-- Sub layers that will be integrated to snapshot but not possible to draw on -->
        <div class="secondary-layer-container sublayer-container" :style="subLayerStyle(i)" v-for="(subLayer, i) in subLayers" :key="`subLayer${i}`">
            <img class="secondary-layer" :style="subLayer.transform ? secondaryLayerStyle : ''" :src="subLayer.src" :id="`subLayer${i}`" v-if="!subLayer.canvas"/>
        </div>

        <!-- Hidden canvas used at init for getting black and white image pixels and make snapshots -->
        <!-- <canvas class="rendering-canvas" ref="tmpCanvas" :style="canvasStyle" :width="width" :height="height" v-show="false"></canvas> -->

        <!-- Hidden canvas used between main layer switching -->
        <canvas ref="tmpCanvas" :style="canvasStyle" :width="width" :height="height" v-show="false"></canvas>
        <canvas ref="tmpCanvas2" :style="canvasStyle" :width="width" :height="height" v-show="false"></canvas>

        <!-- Main drawing canvas -->
        <canvas id="drawing-canvas" ref="canvas" :style="canvasStyle" :width="width" :height="height"></canvas>

        <!-- Up layers that will be integrated to snapshot but not possible to draw on -->
        <div class="secondary-layer-container uplayer-container" :style="upLayerStyle(i)" v-for="(upLayer, i) in upLayers" :key="`upLayer${i}`">
            <img class="secondary-layer" :style="upLayer.transform ? secondaryLayerStyle : ''" :src="upLayer.src" :id="`upLayer${i}`" v-if="!upLayer.canvas"/>
        </div>
    </div>
</template>

<script>
    import Color from 'color'

    export default {
        name: 'colouring-image',
        data () {
            return {
                width: 0,
                height: 0,
                top: 0,
                left: 0,
                bwImage: null,
                canvasBoundingClientRect: null,
                originalPixels: [],         // Pixels of the original main layer
                withLayersPixels: [],       // Pixels of the original main layer + up and sub layers (if they are drawn in the canvas)
                referencePixels: [],        // Will be used to colourize the picture, can be the black and white version if given
                colouredPixels: [],         // Keep information of all user's drawing and stickings, independently from any layer
                startY: 0,
                appliedZoom: 1
            }
        },
        computed: {
            canvasStyle () {
                return {
                    'transform-origin': '0% 0%',
                    'transform': `scale(${1 / this.canvasRatio})`,
                }
            },

            canvas () {
                return this.$refs.canvas
            },

            // utilCanvas () {
            //     return this.$refs.utilCanvas
            // },

            tmpCanvas () {
                return this.$refs.tmpCanvas
            },

            tmpCanvas2 () {
                return this.$refs.tmpCanvas2
            },

            secondaryLayerStyle () {
                return {
                    'transform': `scale(${this.appliedZoom}) rotate(${this.rotation}deg)`
                }
            },

            normalizedToolWidth () {
                return this.canvasRatio * this.toolWidth
            },

            normalizedStickerWidth () {
                return this.canvasRatio * this.stickerWidth
            },

            normalizedStickerHeight () {
                return this.canvasRatio * this.stickerHeight
            },
        },
        props: {
            /**
             * The main layer image. This layer will be coloured
             */
            src: {
                type: String
            },

            /**
             * Black and white version of the main layer, required if main layer is coloured
             */
            bwSrc: {
                type: String
            },

            /**
             * Tool color
             */
            color: {
                type: String,
                default: '#dd3b3b'
            },

            /**
             * Sticker src
             */
            sticker: {
                type: String,
                default: null
            },

            /**
             * Enable/disable eraser
             */
            erase: {
                type: Boolean,
                default: false
            },

            /**
             * Tool size
             */
            toolWidth: {
                type: Number,
                default: 18
            },

            /** 
             * Sticker width
             */
            stickerWidth: {
                type: Number,
                default: 32
            },

            /** 
             * Sticker height
             */
            stickerHeight: {
                type: Number,
                default: 32
            },

            /**
             * List of src that will be displayed behind the main layer. These layers will not be colored.
             */
            subLayers: {
                type: Array,
                default: () => {
                    return []
                }
            },

            /**
             * List of src that will be displayed in front of the main layer. These layers will not be colored.
             */
            upLayers: {
                type: Array,
                default: () => {
                    return []
                }
            },

            /**
             * Applied zoom level
             */
            zoomLevel: {
                type: Number,
                default: 1
            },

            /**
             * Applied rotation
             */
            rotation: {
                type: Number,
                default: 0
            },

            /**
             * Scale factor for the canvas
             */
            canvasRatio: {
                type: Number,
                default: 4,
            }
        },
        methods: {
            subLayerStyle (index) {
                return {
                    'z-index': (index + 1) * -10
                }
            },
            
            upLayerStyle (index) {
                return {
                    'z-index': (index + 1) * 10
                }
            },

            loadImage (src) {
                return new Promise ((resolve, reject) => {
                    let image = new Image()
                    image.onload = () => resolve(image)
                    image.onerror = reject
                    image.src = src
                })
            },

            /**
             * Convert coordinates from getBoundingClientRect() to canvas reference
             */
            windowToCanvas (canvas, x, y) {
                return {
                    x: Math.round(x * this.canvasRatio - this.canvasBoundingClientRect.left * (canvas.width  / this.canvasBoundingClientRect.width)),
                    y: Math.round(y * this.canvasRatio - this.canvasBoundingClientRect.top  * (canvas.height / this.canvasBoundingClientRect.height))
                };
            },

            /**
             * Apply any required transformation to a canvas
             */
            applyTransformations (ctx, invert) {
                let scale = invert ? 1 / this.appliedZoom : this.appliedZoom
                let rotation = this.rotation * Math.PI / 180 * (invert ? -1 : 1)

                ctx.translate(this.canvas.width / 2, this.canvas.height / 2)
                ctx.scale(scale, scale)
                ctx.rotate(rotation)
                ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2)
            },
            
            /**
             * Return canvas' pixels information
             */
            getPixels (canvas) {
                let ctx = canvas.getContext('2d')
                var imgData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
                return imgData.data
            },

            /**
             * Register the reference pixels. This is either the original main layer's pixels (if black and white) or its
             * black and white version given by bw-src prop. We need to do it a promise to ensure the bw-src image is
             * loaded before doing anything.
             */
            registerReferencePixels () {
                return new Promise ((resolve, reject) => {
                    // If a black and white version is provided, load it
                    if (this.bwSrc) {
                        this.bwImage = new Image()
                        this.bwImage.onload = () => {
                            // Get the temp canvas and clear it
                            let ctx = this.tmpCanvas2.getContext('2d')
                            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

                            // Draw the image
                            this.drawLayerImage(ctx, this.bwImage)

                            // Get the data, and exit
                            this.referencePixels = this.getPixels(this.tmpCanvas)
                            resolve()
                        }
                        this.bwImage.onerror = reject
                        this.bwImage.src = this.bwSrc
                    } else {
                        // Clone the original pixels array
                        this.referencePixels = []
                        for (let value of this.originalPixels) {
                            this.referencePixels.push(value)
                        }
                        resolve()
                    }
                })
            },

            drawLayerImage (ctx, layerImage, applyTransform = true, invert = false) {
                // Apply initial transformation if needed
                ctx.save()

                // Apply transforms if required
                if (applyTransform) {
                    this.applyTransformations(ctx, invert)
                }
    
                // Draw the main layer
                ctx.drawImage(layerImage, 0, 0, this.canvas.width, this.canvas.height)
                ctx.restore()
            },

            /**
             * Initialize the scene
             */
            async init () {
                // Load the main layer image
                let image = new Image()
                image.onload = () => {
                    let ctx = this.tmpCanvas.getContext('2d')
                    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
                    // Draw the image
                    this.drawLayerImage(ctx, image)
    
                    // Init an array to keep in memory what color was used on each pixel
                    this.colouredPixels = new Array(this.canvas.width * this.canvas.height)
    
                    // Keep an array of original pixels values
                    this.originalPixels = this.getPixels(this.tmpCanvas)
    
                    // Get black and white image pixels if there is one. This will allow to not mix colors when coloring a pixel
                    this.registerReferencePixels()
                        .then(async () => {
                            let mainCtx = this.canvas.getContext('2d')

                            // We'll draw sublayers if they are canvas type
                            await this.drawCanvasLayers(mainCtx, this.subLayers)

                            // Draw the main layer image
                            this.drawLayerImage(mainCtx, image)

                            // We'll draw uplayers if they are canvas type
                            await this.drawCanvasLayers(mainCtx, this.upLayers)

                            // Keep the pixels of the current initial main canvas
                            this.withLayersPixels = this.getPixels(this.canvas)

                            this.$emit('initialized')
                        })
                }
                image.src = this.src
            },

            /**
             * Draw a list of layers inside the main canvas
             */
            async drawCanvasLayers (context, layers) {
                for (let layer of layers) {
                    if (layer.canvas) {
                        await this.drawCanvasLayer(context, layer)
                    }
                }
            },

            /**
             * Draw an up or sub layer directly inside the main canvas
             */
            async drawCanvasLayer (context, layer) {
                // Will use the temp canvas for some stuff
                let tmpCtx = this.tmpCanvas.getContext('2d')

                // Load the image
                let image = await this.loadImage(layer.src)

                // Save the context, cause we might need to apply transformations
                context.save()

                // Draw the layer image
                this.drawLayerImage(context, image, layer.transform)

                // If the layer provides coloured pixels, we need to apply them ONLY where it should be
                if (layer.pixels) {
                    // We the current image cata of the main drawing canvas
                    let imageData = context.getImageData(0, 0, this.canvas.width, this.canvas.height)
                    let data = imageData.data

                    // Get layer's original pixels, to know where its coloured pixels should be applied
                    tmpCtx.clearRect(0, 0, this.canvas.width, this.canvas.height) 

                    // Draw the image
                    this.drawLayerImage(tmpCtx, image, layer.transform)

                    // Get pixels data
                    let originalLayerData = tmpCtx.getImageData(0, 0, this.canvas.width, this.canvas.height).data

                    // Get layer's coloured pixels data
                    let pixelsData = layer.pixels

                    // If layer zoom level is different than current, we need to get the layers colored pixels data 
                    // relatively to current zoom level
                    // First put the coloured pixel data into the first tmp canvas
                    if (this.zoomLevel !== layer.zoomLevel) {
                        let ratio = this.zoomLevel / layer.zoomLevel
                        tmpCtx.clearRect(0, 0, this.canvas.width, this.canvas.height)
                        tmpCtx.putImageData(new ImageData(new Uint8ClampedArray(layer.pixels), this.canvas.width, this.canvas.height), 0, 0)

                        // Then use the second temp canvas, sized as the layer inside the current scene
                        // We draw the first temp canvas inside the second
                        this.tmpCanvas2.width = this.canvas.width * ratio
                        this.tmpCanvas2.height = this.canvas.height * ratio
                        let resizedCtx = this.tmpCanvas2.getContext('2d')
                        resizedCtx.drawImage(this.tmpCanvas, 0, 0, this.tmpCanvas2.width, this.tmpCanvas2.height)

                        // Then we draw back the second temp canvas into the first one at the right position
                        tmpCtx.clearRect(0, 0, this.canvas.width, this.canvas.height)
                        tmpCtx.drawImage(
                            this.tmpCanvas2,
                            (this.canvas.width - this.tmpCanvas2.width) / 2,
                            (this.canvas.height - this.tmpCanvas2.height) / 2,
                            this.tmpCanvas2.width,
                            this.tmpCanvas2.height,
                        )

                        // Then get pixels data
                        pixelsData = tmpCtx.getImageData(0, 0, this.canvas.width, this.canvas.height).data
                    }

                    // Now for each pixel, if the pixel should be coloured and the layer at this pixel is opaque, we apply the color
                    for (let i = 0; i < data.length; i += 4) {
                        if (pixelsData[i+3] && originalLayerData[i+3]) {
                            data[i] = pixelsData[i]
                            data[i+1] = pixelsData[i+1]
                            data[i+2] = pixelsData[i+2]
                            data[i+3] = pixelsData[i+3]
                        }
                    }

                    // Finally update the main canvas data
                    context.putImageData(imageData, 0, 0)
                }
            },

            /**
             * Return a clone array of coloured pixels
             */
            cloneColouredPixels () {
                let colouredPixels = [];

                for (let pixel of this.colouredPixels) {
                    if (!pixel) {
                        colouredPixels.push(null)
                        continue
                    }

                    colouredPixels.push({
                        red: pixel.red,
                        green: pixel.green,
                        blue: pixel.blue,
                        sticker: pixel.sticker,
                    });
                }

                return colouredPixels
            },

            /**
             * Return a clone array of coloured pixels as Canvas data
             */
            cloneColouredPixelsAsData () {
                let data = []

                for (let pixel of this.colouredPixels) {
                    if (!pixel) {
                        data.push(0)
                        data.push(0)
                        data.push(0)
                        data.push(0)
                    } else {
                        data.push(pixel.red)
                        data.push(pixel.green)
                        data.push(pixel.blue)
                        data.push(pixel.red || pixel.green || pixel.blue ? 255 : 0)
                    }
                }

                return data
            },

            /**
             * Delete all drawings and stickers
             */
            clear () {
                this.init()
            },

            /**
             * Apply specific coloured pixels and redraw the final result
             */
            setColouredPixels (colouredPixels) {
                this.colouredPixels = colouredPixels

                let ctx = this.canvas.getContext('2d')

                // Get pixels from the canvas
                var imgData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)

                // Apply colors on the canvas
                for (let i = 0; i < colouredPixels.length; i++) {
                    let pixel = colouredPixels[i]

                    if (!pixel) continue

                    let pos = i*4

                    if (!this.originalPixels[pos+3]) continue

                    if (pixel.sticker) {
                        imgData.data[pos] = pixel.red
                        imgData.data[pos+1] = pixel.green
                        imgData.data[pos+2] = pixel.blue
                    } else {
                        imgData.data[pos] = (this.referencePixels[pos] / 255) * pixel.red
                        imgData.data[pos+1] = (this.referencePixels[pos+1] / 255) * pixel.green
                        imgData.data[pos+2] = (this.referencePixels[pos+2] / 255) * pixel.blue
                    }
                }

                ctx.putImageData(imgData, 0, 0)
            },

            /**
             * Draw or apply sticker depending on current mode
             */
            draw (x, y) {
                if (!this.sticker) {
                    this.paint(x, y)
                } else {
                    this.stick(x, y)
                }
            },

            /**
             * Draw a sticker to the given context applying a certain rotation
             */
            drawStickerToContext (sticker, ctx, x, y, rotation) {
                ctx.save()
                ctx.translate(x, y)
                ctx.rotate(rotation)

                // Draw the sticker
                ctx.drawImage(
                    sticker,
                    -this.normalizedStickerWidth / 2,
                    -this.normalizedStickerHeight / 2,
                    this.normalizedStickerWidth,
                    this.normalizedStickerHeight
                )

                ctx.restore()
            },

            /**
             * Apply the current sticker to the given coordinates
             */
            stick (x, y) {
                let ctx = this.canvas.getContext('2d')

                var stickerImage = new Image()
                stickerImage.onload = () => {
                    let randomRotation = (-40 + Math.random() * 80) * Math.PI / 180

                    this.drawStickerToContext(stickerImage, ctx, x, y, randomRotation)

                    // Make sure the sticker does not appear on pixels that are originally transparent
                    var imgData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)

                    // Now we need to keep information on pixels colored by the sticker. We must ensure we take ONLY sticker's
                    // pixels, so we will draw the sticker in the exact same position in the utils canvas, and take pixel
                    // values from the utils canvas. This way we don't take main layer pixel information by mistake
                    let utilCtx = this.tmpCanvas.getContext('2d')
                    utilCtx.clearRect(0, 0, this.canvas.width, this.canvas.height)
                    this.drawStickerToContext(stickerImage, utilCtx, x, y, randomRotation)
                    var utilImgData = utilCtx.getImageData(0, 0, this.canvas.width, this.canvas.height)

                    // Here we will keep transparent pixels that are in the main layer
                    // Use diagonal for the "checked rectangle" around the reference point as the sticker can have a rotation
                    let padding = Math.ceil(Math.sqrt(this.normalizedStickerWidth * this.normalizedStickerWidth + this.normalizedStickerHeight * this.normalizedStickerHeight) / 2)
                    for (var pixelX = x - padding; pixelX < x + padding + 1; pixelX++) {
                        for (var pixelY = y - padding; pixelY < y + padding + 1; pixelY++) {
                            let pos = (pixelY - 1) * this.canvas.width * 4 + pixelX * 4

                            // If the original main layer image is transparent, we do not want this pixel to be the sticker's
                            // So we reset to the original value (mainlayer + sub and up layers)
                            if (!this.originalPixels[pos+3]) {
                                imgData.data[pos] = this.withLayersPixels[pos]
                                imgData.data[pos+1] = this.withLayersPixels[pos+1]
                                imgData.data[pos+2] = this.withLayersPixels[pos+2]
                                imgData.data[pos+3] = this.withLayersPixels[pos+3]
                            }

                            // We keep colored pixels. Using the util context image data for doing so
                            if (utilImgData.data[pos+3] > 0) {
                                this.colouredPixels[pos/4] = {
                                    red: utilImgData.data[pos], 
                                    green: utilImgData.data[pos+1], 
                                    blue: utilImgData.data[pos+2],
                                    sticker: true,
                                }
                            }
                        }
                    }
                    ctx.putImageData(imgData, 0, 0)
                }
                stickerImage.src = this.sticker
            },

            /**
             * Apply color to the given coordinates
             */
            paint (x, y) {
                let ctx = this.canvas.getContext('2d')
                let color = Color(this.color)
                let red = color.red()
                let green = color.green()
                let blue = color.blue()

                // Give the distance of the given pixel with the touched pixel
                let distanceToPoint = (x2, y2) => {
                    var a = x - x2
                    var b = y - y2

                    return Math.sqrt(a*a + b*b)
                }

                // Get pixels from the canvas
                var imgData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
                
                // Check all pixels to colorize those which need
                let toolRadius = Math.round(this.normalizedToolWidth / 2)
                for (var pixelX = x - toolRadius; pixelX < x + toolRadius + 1; pixelX++) {
                    for (var pixelY = y - toolRadius; pixelY < y + toolRadius + 1; pixelY++) {
                        let pos = (pixelY - 1) * this.canvas.width * 4 + pixelX * 4

                        // if (this.originalPixels[pos+3] == 0) continue

                        if (distanceToPoint(pixelX, pixelY) <= toolRadius) {
                            // If we want to erase
                            if (this.erase) {
                                imgData.data[pos] = this.originalPixels[pos]
                                imgData.data[pos+1] = this.originalPixels[pos+1]
                                imgData.data[pos+2] = this.originalPixels[pos+2]

                                this.colouredPixels[pos/4] = null
                            }
                            // If the pixel is not yet coloured with the selected color, color it
                            else {
                                // Colorize only if original pixel is opaque
                                if (this.originalPixels[pos+3]) {
                                    imgData.data[pos] = (this.referencePixels[pos] / 255) * red
                                    imgData.data[pos+1] = (this.referencePixels[pos+1] / 255) * green
                                    imgData.data[pos+2] = (this.referencePixels[pos+2] / 255) * blue
                                }

                                this.colouredPixels[pos/4] = {
                                    red: red, 
                                    green: green, 
                                    blue: blue,
                                    sticker: false,
                                }
                            }
                        }
                    }
                }
                ctx.putImageData(imgData, 0, 0)
            },

            /**
             * Draw the given secondary layers into ctx
             */
            drawSecondaryLayer (ctx, layers, refKey, applyTransformations) {
                for (var i = 0; i < layers.length; i++) {
                    if (layers[i].canvas) continue
                    this.drawLayerImage(ctx, document.getElementById(`${refKey}${i}`), applyTransformations && layers[i].transform)
                }
            },

            /**
             * Create a snapshot of the scene including sub and up layers. Returns a base64 src
             */
            snapshot (applyTransformations = true) {
                return new Promise((resolve, reject) => {
                    let ctx = this.tmpCanvas.getContext('2d')

                    // Ensure nothing remains in the canvas
                    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

                    // Draw sub layers
                    this.drawSecondaryLayer(ctx, this.subLayers, 'subLayer', applyTransformations)

                    // Draw main layer
                    var mainLayer = new Image()
                    mainLayer.onload = () => {
                        this.drawLayerImage(ctx, mainLayer, applyTransformations, true)

                        // Draw sub layers
                        this.drawSecondaryLayer(ctx, this.upLayers, 'upLayer', applyTransformations)
                        
                        mainLayer = null
                        resolve(this.tmpCanvas.toDataURL())
                    }
                    mainLayer.onerror = () => {
                        reject()
                    }
                    mainLayer.src = this.canvas.toDataURL()
                })
            },

            /**
             * Handle click event. Basically gets click's coordinates in canvas and draw whatever should be
             */
            onClick (e) {
                var loc = this.windowToCanvas(this.canvas, e.clientX, e.clientY)
                this.draw(loc.x, loc.y)
            },

            /**
             * Handle the touch start event, mainly for Safari issue
             */
            onTouchStart () {
                // On Safari, the canvas bounding box will change as touch goes, so we have to ensure to always
                // use the same throughout all the move process
                this.canvasBoundingClientRect = this.canvas.getBoundingClientRect()
            },

            /**
             * Handle the finger move event
             */
            onSwipe (e) {
                if (this.sticker) {
                    return
                }

                var loc = this.windowToCanvas(this.canvas, e.touches[0].clientX, e.touches[0].clientY)
                this.paint(loc.x, loc.y)
            }
        },

        mounted () {
            // Setup the applied zoom level and forbid modify it after init
            this.appliedZoom = this.zoomLevel

            // Get component bounding rect values
            this.width = Math.round(this.$refs.vpcImage.getBoundingClientRect().width) * this.canvasRatio
            this.height = Math.round(this.$refs.vpcImage.getBoundingClientRect().height) * this.canvasRatio
            this.top = Math.round(this.$refs.vpcImage.getBoundingClientRect().top)
            this.left = Math.round(this.$refs.vpcImage.getBoundingClientRect().left)

            // Init the drawing
            this.init()
        },

        watch: {
            /**
             * When switching the main layer, we need to load it and make sure everything that was drawn before
             * is drawn on the new layer
             */
            src (value) {
                // Emit a refresh start event
                this.$emit('refresh-start')

                // Load the new layer
                var image = new Image()
                image.onload = async () => {
                    let ctx = this.tmpCanvas.getContext('2d')
                    ctx.clearRect(0, 0, this.tmpCanvas.width, this.tmpCanvas.height)

                    // First we need to get the original pixels of the new main layer image
                    // WITHOUT the sub and up layers
                    this.drawLayerImage(ctx, image)

                    // Keep an array of original pixels values
                    this.originalPixels = this.getPixels(this.tmpCanvas)

                    // Then clear the context again before drawing actual content
                    ctx.clearRect(0, 0, this.tmpCanvas.width, this.tmpCanvas.height)

                    // We'll draw sublayers if they are canvas type
                    await this.drawCanvasLayers(ctx, this.subLayers)
    
                    // Draw the main layer image
                    this.drawLayerImage(ctx, image)

                    // We'll draw uplayers if they are canvas type
                    await this.drawCanvasLayers(ctx, this.upLayers)

                    // Keep the pixels of the current initial main canvas
                    this.withLayersPixels = this.getPixels(this.tmpCanvas)

                    // var newLayerData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
                    // let mainCtx = this.canvas.getContext('2d')
                    // mainCtx.putImageData(newLayerData, 0, 0)
                
                    // Get black and white image pixels if there is one. This will allow to not mix colors when coloring a pixel
                    this.registerReferencePixels()
                        .then(() => {
                            // Then we put back pixels values that were on the canvas but not on the former main layer
                            var newLayerData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
                            for (var i = 0; i < this.colouredPixels.length; i++) {
                                // If current pixel is not colored, continue
                                if (!this.colouredPixels[i]) {
                                    continue
                                }
        
                                let currentColor = this.colouredPixels[i]
        
                                // Get pixel position
                                let pos = i * 4
        
                                // Paint pixel
                                if (this.referencePixels[pos+3] > 0) {
                                    if (!this.colouredPixels[i].sticker) {
                                        newLayerData.data[pos] = (this.referencePixels[pos] / 255) * currentColor.red
                                        newLayerData.data[pos+1] = (this.referencePixels[pos+1] / 255) * currentColor.green
                                        newLayerData.data[pos+2] = (this.referencePixels[pos+2] / 255) * currentColor.blue
                                        newLayerData.data[pos+3] = this.referencePixels[pos+3]
                                    } else {
                                        newLayerData.data[pos] = currentColor.red
                                        newLayerData.data[pos+1] = currentColor.green
                                        newLayerData.data[pos+2] = currentColor.blue
                                    }
                                }
                            }

                            // Apply image data to the main canvas
                            let mainCtx = this.canvas.getContext('2d')
                            mainCtx.putImageData(newLayerData, 0, 0)

                            // Emit a refresh end event
                            this.$emit('refresh-end')
                        })
                }
                image.src = value
            },
        }
    }
</script>

<style scoped>

    .vpc-image {
        position: relative;
        overflow: hidden;   
        z-index: 9999999;
    }

    .secondary-layer-container {
        position: absolute;
        overflow: hidden;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
    }

    .secondary-layer {
        width: 100%;
        height: 100%;
    }

    canvas {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: -1;
    }

</style>