import Vue from 'vue'
import ColouringImage from './ColouringImage.vue'
import { VueHammer } from 'vue2-hammer'

// Dependencies
Vue.use(VueHammer)

// Globally register the component
Vue.component('vpc-image', ColouringImage)

// Export
export default ColouringImage