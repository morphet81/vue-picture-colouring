<template>
    <div ref="vpcImage" class="vpc-image">
        <!-- Sub layers that will be integrated to snapshot but not possible to draw on -->
        <!-- <img class="sublayer" :style="subLayerStyle" :width="width" :height="height" v-for="(subLayer, i) in subLayers" :key="i" :src="subLayer" :id="`subLayer${i}`"/> -->
        
        
        <div class="sublayerContainer" :style="layerStyle" v-for="(subLayer, i) in subLayers" :key="i">
            <img class="sublayer" :style="subLayerStyle" :src="subLayer" :id="`subLayer${i}`"/>
        </div>

        <!-- Main drawing canvas -->
        <canvas ref="canvas" :style="layerStyle" :width="width" :height="height" @click="onClick" @touchstart="onTouchStart" @touchmove="onSwipe"></canvas>

        <!-- Hidden canvas used at init for getting black and white image pixels and make snapshots -->
        <canvas ref="utilCanvas" :width="width" :height="height" v-show="false"></canvas>
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
                image: null,
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
            canvas () {
                return this.$refs.canvas
            },
            utilCanvas () {
                return this.$refs.utilCanvas
            },
            subLayerStyle () {
                return {
                    'width': `${this.width}px`,
                    'height': `${this.height}px`,
                    'transform': `scale(${this.appliedZoom})`
                }
            },
            layerStyle () {
                return {
                    'width': `${this.width}px`,
                    'height': `${this.height}px`,
                    'top': `${this.top}px`,
                    'left': `${this.left}px`,
                }
            }
        },
        props: {
            src: {
                type: String
            },
            bwSrc: {
                type: String
            },
            color: {
                type: String,
                default: '#dd3b3b'
            },
            sticker: {
                type: String,
                default: null
            },
            erase: {
                type: Boolean,
                default: false
            },
            toolWidth: {
                type: Number,
                default: 18
            },
            stickerWidth: {
                type: Number,
                default: 32
            },
            stickerHeight: {
                type: Number,
                default: 32
            },
            subLayers: {
                type: Array,
                default: () => {
                    return []
                }
            },
            zoomLevel: {
                type: Number,
                default: 1
            }
        },
        methods: {
            windowToCanvas (canvas, x, y) {
                return {
                    x: Math.round(x - this.canvasBoundingClientRect.left * (canvas.width  / this.canvasBoundingClientRect.width)),
                    y: Math.round(y - this.canvasBoundingClientRect.top  * (canvas.height / this.canvasBoundingClientRect.height))
                };
            },
            applyTransformations (ctx) {
                ctx.translate(this.canvas.width / 2, this.canvas.height / 2)
                ctx.scale(this.appliedZoom, this.appliedZoom)
                ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2)
            },
            getPixels (canvas) {
                let ctx = canvas.getContext('2d')

                var pixels = new Array(this.canvas.width * this.canvas.height * 4)
                var imgData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)

                // Get all pixels information
                for (var i = 0; i < imgData.data.length; i += 4) {
                    pixels[i] = imgData.data[i]
                    pixels[i+1] = imgData.data[i+1]
                    pixels[i+2] = imgData.data[i+2]
                    pixels[i+3] = imgData.data[i+3]
                }

                return pixels
            },
            init () {
                let ctx = this.canvas.getContext('2d')

                // Ensure the canvas is empty
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

                // Apply initial transformation if needed
                ctx.save()
                this.applyTransformations(ctx)

                // Draw the main layer
                ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height)
                ctx.restore()

                // Init an array to keep in memory what color was used on each pixel
                this.colouredPixels = new Array(this.canvas.width * this.canvas.height)

                // Keep an array of original pixels values
                this.originalPixels = this.getPixels(this.canvas)

                // Get black and white image pixels if there is one
                if (this.bwSrc) {
                    let ctx = this.utilCanvas.getContext('2d')
                    ctx.save()
                    this.applyTransformations(ctx)
                    ctx.drawImage(this.bwImage, 0, 0, this.canvas.width, this.canvas.height)
                    ctx.restore()
                    this.referencePixels = this.getPixels(this.utilCanvas)
                } else {
                    this.referencePixels = this.originalPixels
                }
            },
            draw (x, y) {
                if (!this.sticker) {
                    this.paint(x, y)
                } else {
                    this.stick(x, y)
                }
            },
            stick (x, y) {
                let ctx = this.canvas.getContext('2d')

                var stickerImage = new Image()
                stickerImage.onload = () => {
                    ctx.save()
                    ctx.translate(x, y)
                    ctx.rotate((-40 + Math.random() * 80) * Math.PI / 180)

                    // Draw the sticker
                    ctx.drawImage(
                        stickerImage,
                        -this.stickerWidth / 2,
                        -this.stickerHeight / 2,
                        this.stickerWidth,
                        this.stickerHeight
                    )
                    ctx.restore()

                    // Make sure the sticker does appear on pixels that are originally transparent
                    var imgData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)

                    // Use diagonal for the "checked rectangle" around the refernce point as the sticker can have a rotation
                    let padding = Math.ceil(Math.sqrt(this.stickerWidth*this.stickerWidth + this.stickerHeight*this.stickerHeight) / 2)
                    for (var pixelX = x - padding; pixelX < x + padding + 1; pixelX++) {
                        for (var pixelY = y - padding; pixelY < y + padding + 1; pixelY++) {
                            let pos = (pixelY - 1) * this.canvas.width * 4 + pixelX * 4
                            imgData.data[pos+3] = this.originalPixels[pos+3]
                        }
                    }
                    ctx.putImageData(imgData, 0, 0)
                }
                stickerImage.src = this.sticker
            },
            paint (x, y) {
                let ctx = this.canvas.getContext('2d')
                let color = Color(this.color)

                // Give the distance of the given pixel with the touched pixel
                let distanceToPoint = (x2, y2) => {
                    var a = x - x2
                    var b = y - y2

                    return Math.sqrt(a*a + b*b)
                }

                // Get pixels from the canvas
                var imgData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
                
                // Check all pixels to colorize those which need
                for (var pixelX = x - this.toolWidth / 2; pixelX < x + this.toolWidth / 2 + 1; pixelX++) {
                    for (var pixelY = y - this.toolWidth / 2; pixelY < y + this.toolWidth / 2 + 1; pixelY++) {
                        let pos = (pixelY - 1) * this.canvas.width * 4 + pixelX * 4

                        if (distanceToPoint(pixelX, pixelY) <= this.toolWidth / 2) {
                            // If we want to erase
                            if (this.erase) {
                                imgData.data[pos] = this.originalPixels[pos]
                                imgData.data[pos+1] = this.originalPixels[pos+1]
                                imgData.data[pos+2] = this.originalPixels[pos+2]

                                this.colouredPixels[pos/4] = null
                            }
                            // If the pixel is not yet coloured with the selected color, color it
                            else if (this.colouredPixels[pos / 4] !== this.color) {
                                imgData.data[pos] = (this.referencePixels[pos] / 255) * color.red()
                                imgData.data[pos+1] = (this.referencePixels[pos+1] / 255) * color.green()
                                imgData.data[pos+2] = (this.referencePixels[pos+2] / 255) * color.blue()

                                this.colouredPixels[pos/4] = this.color
                            }
                        }
                    }
                }
                ctx.putImageData(imgData, 0, 0)
            },
            snapshotCanvas (drawSublayers) {
                return new Promise((resolve, reject) => {
                    let that = this
                    let ctx = this.utilCanvas.getContext('2d')

                    // Ensure nothing remains in the canvas
                    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

                    // Draw sub layers if required
                    ctx.save()
                    this.applyTransformations(ctx)
                    if (drawSublayers) {
                        for (var i = 0; i < this.subLayers.length; i++) {
                            ctx.drawImage(document.getElementById(`subLayer${i}`), 0, 0, this.canvas.width, this.canvas.height)
                        }
                    }
                    ctx.restore()

                    // Draw main layer
                    var mainLayer = new Image()
                    mainLayer.onload = () => {
                        ctx.drawImage(mainLayer, 0, 0, that.canvas.width, that.canvas.height)
                        mainLayer = null
                        resolve(this.utilCanvas.toDataURL())
                    }
                    mainLayer.onerror = () => {
                        reject()
                    }
                    mainLayer.src = this.canvas.toDataURL()
                })
            },
            snapshot () {
                return this.snapshotCanvas(true)
            },
            onClick (e) {
                var loc = this.windowToCanvas(this.canvas, e.clientX, e.clientY)
                this.draw(loc.x, loc.y)
            },
            onTouchStart () {
                // On Safari, the canvas bounding box will change as touch goes, so we have to ensure to always
                // use the same throughout all the move process
                this.canvasBoundingClientRect = this.canvas.getBoundingClientRect()
            },
            onSwipe (e) {
                if (this.sticker) {
                    return
                }

                var loc = this.windowToCanvas(this.canvas, e.touches[0].clientX, e.touches[0].clientY)
                this.paint(loc.x, loc.y)
            }
        },
        mounted () {
            let that = this

            // Setup the applied zoom level and forbid modify it after init
            this.appliedZoom = this.zoomLevel

            // Get component bounding rect values
            this.width = Math.round(this.$refs.vpcImage.getBoundingClientRect().width)
            this.height = Math.round(this.$refs.vpcImage.getBoundingClientRect().height)
            this.top = Math.round(this.$refs.vpcImage.getBoundingClientRect().top)
            this.left = Math.round(this.$refs.vpcImage.getBoundingClientRect().left)

            // Load the main image
            this.image = new Image()
            this.image.onload = () => {
                // If the black and white version is given, also load it
                if (that.bwSrc) {
                    that.bwImage = new Image()
                    that.bwImage.onload = () => {
                        that.init()
                    }
                    that.bwImage.src = this.bwSrc
                } else {
                    that.init()
                }
            }
            this.image.src = this.src
        },
        watch: {
            src () {
                let that = this
                var image = new Image()
                image.onload = () => {
                    let ctx = that.canvas.getContext('2d')

                    // Keep information about the former main layer pixels
                    let formerPixels = this.originalPixels.slice()

                    // Keep information about the current draw image
                    var currentData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
                    let currentPixels = currentData.data.slice()

                    // First we need to clear the canvas
                    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

                    // We draw the new layer
                    ctx.save()
                    this.applyTransformations(ctx)
                    ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height)
                    ctx.restore()

                    // Keep an array of original pixels values
                    this.originalPixels = this.getPixels(this.canvas)

                    // Then we put back pixels values that were on the canvas but not on the former main layer
                    var newLayerData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
                    for (var i = 0; i < newLayerData.data.length; i++) {
                        if (formerPixels[i] != currentPixels[i]) {
                            newLayerData.data[i] = currentPixels[i]
                        }
                    }
                    ctx.putImageData(newLayerData, 0, 0)
                }
                image.src = this.src
            }
        }
    }
</script>

<style scoped>

    .vpc-image {
        overflow: hidden;   
    }

    .sublayerContainer {
        position: absolute;
        overflow: hidden;
        top: 0;
        left: 0;
        right: 0;
    }

    canvas {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
    }

</style>