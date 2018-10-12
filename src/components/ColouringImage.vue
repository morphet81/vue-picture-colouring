<template>
    <div ref="vpcImage" class="vpc-image" @click="onClick" @touchstart="onTouchStart" @touchmove="onSwipe">
        <!-- Sub layers that will be integrated to snapshot but not possible to draw on -->
        <div class="secondary-layer-container sublayer-container" :style="subLayerStyle(i)" v-for="(subLayer, i) in subLayers" :key="`subLayer${i}`">
            <img class="secondary-layer" :style="subLayer.transform ? secondaryLayerStyle : ''" :src="subLayer.src" :id="`subLayer${i}`"/>
        </div>

        <!-- Hidden canvas used at init for getting black and white image pixels and make snapshots -->
        <canvas class="rendering-canvas" ref="utilCanvas" :style="canvasStyle" :width="width" :height="height" v-show="false"></canvas>

        <!-- Hidden canvas used between maing layer switching -->
        <canvas class="rendering-canvas" ref="tmpCanvas" :style="canvasStyle" :width="width" :height="height" v-show="false"></canvas>

        <!-- Main drawing canvas -->
        <canvas id="drawing-canvas" ref="canvas" :style="canvasStyle" :width="width" :height="height"></canvas>

        <!-- Up layers that will be integrated to snapshot but not possible to draw on -->
        <div class="secondary-layer-container uplayer-container" :style="upLayerStyle(i)" v-for="(upLayer, i) in upLayers" :key="`upLayer${i}`">
            <img class="secondary-layer" :style="upLayer.transform ? secondaryLayerStyle : ''" :src="upLayer.src" :id="`upLayer${i}`"/>
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
                originalPixels: [],
                referencePixels: [],        // Will be used to colourize the picture, can be the black and white version if given
                colouredPixels: [],
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

            utilCanvas () {
                return this.$refs.utilCanvas
            },

            tmpCanvas () {
                return this.$refs.tmpCanvas
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
                default: 2,
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
                    if (this.bwSrc) {
                        this.bwImage = new Image()
                        this.bwImage.onload = () => {
                            let ctx = this.utilCanvas.getContext('2d')
                            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
                            ctx.save()
                            this.applyTransformations(ctx)
                            ctx.drawImage(this.bwImage, 0, 0, this.canvas.width, this.canvas.height)
                            ctx.restore()
                            this.referencePixels = this.getPixels(this.utilCanvas)
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

            drawLayerImage (ctx, layerImage) {
                // Ensure the canvas is empty
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
                // Apply initial transformation if needed
                ctx.save()
                this.applyTransformations(ctx)
    
                // Draw the main layer
                ctx.drawImage(layerImage, 0, 0, this.canvas.width, this.canvas.height)
                ctx.restore()
            },

            /**
             * Initialize the scene
             */
            init () {
                // Load the main layer image
                let image = new Image()
                image.onload = () => {
                    let ctx = this.tmpCanvas.getContext('2d')
    
                    // Draw the image
                    this.drawLayerImage(ctx, image)
    
                    // Init an array to keep in memory what color was used on each pixel
                    this.colouredPixels = new Array(this.canvas.width * this.canvas.height)
    
                    // Keep an array of original pixels values
                    this.originalPixels = this.getPixels(this.tmpCanvas)
    
                    // Get black and white image pixels if there is one. This will allow to not mix colors when coloring a pixel
                    this.registerReferencePixels()
                        .then(() => {
                            let mainCtx = this.canvas.getContext('2d')
                            mainCtx.putImageData(ctx.getImageData(0, 0, this.canvas.width, this.canvas.height), 0, 0)
                            this.$emit('initialized')
                        })
                }
                image.src = this.src
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
                    let utilCtx = this.utilCanvas.getContext('2d')
                    utilCtx.clearRect(0, 0, this.canvas.width, this.canvas.height)
                    this.drawStickerToContext(stickerImage, utilCtx, x, y, randomRotation)
                    var utilImgData = utilCtx.getImageData(0, 0, this.canvas.width, this.canvas.height)

                    // Here we will keep transparent pixels that are in the main layer
                    // Use diagonal for the "checked rectangle" around the reference point as the sticker can have a rotation
                    let padding = Math.ceil(Math.sqrt(this.normalizedStickerWidth * this.normalizedStickerWidth + this.normalizedStickerHeight * this.normalizedStickerHeight) / 2)
                    for (var pixelX = x - padding; pixelX < x + padding + 1; pixelX++) {
                        for (var pixelY = y - padding; pixelY < y + padding + 1; pixelY++) {
                            let pos = (pixelY - 1) * this.canvas.width * 4 + pixelX * 4
                            imgData.data[pos+3] = this.originalPixels[pos+3]

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
                                imgData.data[pos] = (this.referencePixels[pos] / 255) * red
                                imgData.data[pos+1] = (this.referencePixels[pos+1] / 255) * green
                                imgData.data[pos+2] = (this.referencePixels[pos+2] / 255) * blue

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
                    ctx.save()

                    // Apply transformation only if required
                    if (applyTransformations && layers[i].transform) {
                        this.applyTransformations(ctx)
                    }

                    ctx.drawImage(document.getElementById(`${refKey}${i}`), 0, 0, this.canvas.width, this.canvas.height)
                    ctx.restore()
                }
            },

            /**
             * Create a snapshot of the scene including sub and up layers. Returns a base64 src
             */
            snapshot (applyTransformations = true) {
                return new Promise((resolve, reject) => {
                    let that = this
                    let ctx = this.utilCanvas.getContext('2d')

                    // Ensure nothing remains in the canvas
                    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

                    // Draw sub layers
                    this.drawSecondaryLayer(ctx, this.subLayers, 'subLayer', applyTransformations)

                    // Draw main layer
                    var mainLayer = new Image()
                    mainLayer.onload = () => {
                        if (!applyTransformations) {
                            ctx.save()
                            this.applyTransformations(ctx, true)
                        }

                        ctx.drawImage(mainLayer, 0, 0, that.canvas.width, that.canvas.height)

                        if (!applyTransformations) {
                            ctx.restore()
                        }

                        // Draw sub layers
                        this.drawSecondaryLayer(ctx, this.upLayers, 'upLayer', applyTransformations)
                        
                        mainLayer = null
                        resolve(this.utilCanvas.toDataURL())
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
            src () {
                // Emit a refresh start event
                this.$emit('refresh-start')

                // Load the new layer
                var image = new Image()
                image.onload = () => {
                    let ctx = this.tmpCanvas.getContext('2d')
    
                    // Draw the image
                    this.drawLayerImage(ctx, image)

                    // Keep an array of original pixels values
                    this.originalPixels = this.getPixels(this.tmpCanvas)

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
                                if (!this.colouredPixels[i].sticker) {
                                    newLayerData.data[pos] = (this.referencePixels[pos] / 255) * currentColor.red
                                    newLayerData.data[pos+1] = (this.referencePixels[pos+1] / 255) * currentColor.green
                                    newLayerData.data[pos+2] = (this.referencePixels[pos+2] / 255) * currentColor.blue
                                    newLayerData.data[pos+3] = this.referencePixels[pos+3]
                                } else {
                                    if (this.referencePixels[pos+3] > 0) {
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
                image.src = this.src
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