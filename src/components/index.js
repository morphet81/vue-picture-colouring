import Vue from 'vue'
import ColouringImage from './ColouringImage.vue'
import { VueHammer } from 'vue2-hammer'

// Dependencies
Vue.use(VueHammer)

// List components we want to make available in the library
const components = {
    'vic-image': ColouringImage
}

// Globally register all the components
Object.keys(components).forEach(name => {
    Vue.component(name, components[name])
})

// Export
export default components