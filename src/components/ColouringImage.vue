<template>
    <div>
        <canvas ref="canvas" :width="width" :height="height" @click="onClick" @touchstart="onTouchStart" @touchmove="onSwipe"></canvas>

        <!-- This will be used for showing the tool on non mobile devices -->
        <!-- <canvas ref="overlay" :width="width" :height="height" @click="onClick" @touchmove="onSwipe"></canvas> -->
    </div>
</template>

<script>
/* eslint-disable */

    import Color from 'color'

    export default {
        name: 'colouring-image',
        data () {
            return {
                image: null,
                canvasBoundingClientRect: null,
                originalPixels: [],
                colouredPixels: [],
                startY: 0
            }
        },
        computed: {
            canvas () {
                return this.$refs.canvas
            }
        },
        props: {
            src: {
                type: String
            },
            width: {
                type: Number,
                default: 640
            },
            height: {
                type: Number,
                default: 480
            },
            color: {
                type: String,
                default: '#dd3b3b'
            },
            erase: {
                type: Boolean,
                default: false
            },
            toolWidth: {
                type: Number,
                default: 8
            }
        },
        methods: {
            windowToCanvas(canvas, x, y) {
                return {
                    x: x - this.canvasBoundingClientRect.left * (canvas.width  / this.canvasBoundingClientRect.width),
                    y: y - this.canvasBoundingClientRect.top  * (canvas.height / this.canvasBoundingClientRect.height)
                };
            },
            init () {
                let ctx = this.canvas.getContext('2d')
                ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height)

                // Init an array to keep in memory what color was used on each pixel
                this.colouredPixels = new Array(this.canvas.width * this.canvas.height)

                // Keep an array of original pixels values
                this.originalPixels = new Array(this.canvas.width * this.canvas.height * 3)
                var imgData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
                for (var i = 0; i < imgData.data.length; i += 3) {
                    this.originalPixels[i] = imgData.data[i]
                    this.originalPixels[i+1] = imgData.data[i+1]
                    this.originalPixels[i+2] = imgData.data[i+2]
                }
            },
            colour (x, y, r, g, b) {
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
                                imgData.data[pos] = (this.originalPixels[pos] / 255) * color.red()
                                imgData.data[pos+1] = (this.originalPixels[pos+1] / 255) * color.green()
                                imgData.data[pos+2] = (this.originalPixels[pos+2] / 255) * color.blue()

                                this.colouredPixels[pos/4] = this.color
                            }
                        }
                    }
                }
                ctx.putImageData(imgData, 0, 0)
            },
            onClick (e) {
                var loc = this.windowToCanvas(this.canvas, e.clientX, e.clientY)
                this.colour(loc.x, loc.y, this.color)
            },
            onTouchStart (e) {
                // On Safari, the canvas bounding box will change as touch goes, so we have to ensure to always
                // use the same throughout all the move process
                this.canvasBoundingClientRect = this.canvas.getBoundingClientRect()
            },
            onSwipe (e) {
                var loc = this.windowToCanvas(this.canvas, e.touches[0].clientX, e.touches[0].clientY)
                this.colour(loc.x, loc.y, this.color)
            }
        },
        mounted () {
            let that = this
            this.image = new Image()
            this.image.onload = () => {
                that.init()
                that.image.onload = null
            }
            this.image.src = this.src
        }
    }
</script>

<style scoped>

    canvas {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: aliceblue
    }

</style>