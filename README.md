<div align="center">
  <img src="https://i.imgur.com/6ANjYrZ.png" />
</div>

# MutableJS

Minimal JavaScript library. Only 18kb. If you're into Web Components, Polymer, Vue, you're 👌.

## Use

```html
<script src="dist/mutable.min.js"></script>
```

or

```js
const Mutable = require('dist/mutable.min.js')
```

### Initialization

```html
<div id="app">
  {{ greet }}
</div>
```

```js
new Mutable({
  el: '#app',
  data() {
    return {
      greet: 'Hola ke pasa',
    }
  },
  methods: {},
  hooks: {},
})
```

### Methods

```js
new Mutable({
  el: '#app',
  data() {
    return {
      greet: 'Hola ke pasa',
    }
  },
  methods: {
    newGreet(text) {
      this.set('greet', text)
    }
  },
  hooks: {
    mounted() {
      this.methods('newGreet', ['¡Hola a tod@s!'])
    }
  },
})
```

Other example:

```html
<div id="app">
  {{ upperLetters(greet) }}
</div>
```

```js
new Mutable({
  el: '#app',
  data() {
    return {
      greet: 'Hola ke pasa',
    }
  },
  methods: {
    upperLetters(text) {
       return text.toUpperCase()
     },
  },
})
```

Will render:

```html
HOLA KE PASA
```

### Conditionals

```html
<p m-if="condition">If true will show</p>
```

```html
<p m-show="condition">If true will toggle</p>
```

### Loops

```html
<div id="app">
  <ul>
    <li m-for="beer in beers">{{ beer }}</li>
  </ul>
</div>
```

```js
new Mutable({
  el: '#app',
  data() {
    return {
      beers: ['Pale Ale', 'Barley Wine', 'IPA', 'Golden Ale'],
    }
  },
})
```

Will render:

```html
<ul>
  <li>Pale Ale</li>
  <li>Barley Wine</li>
  <li>IPA</li>
  <li>Golden Ale</li>
</ul>
```

### Events

```html
<div id="app">
  <button m-on:click="randomize">Click me</button>
  <p>Random beer: {{ beer }}</p>
</div>
```

```js
new Mutable({
  el: '#app',
  data() {
    return {
      beer: '',
      beers: ['Pale Ale', 'Barley Wine', 'IPA', 'Golden Ale'],
    }
  },
  methods: {
    randomize() {
      const getBeer = Math.floor(Math.random() * this.get(beers).length)
      this.set('beer', getBeer)
    }
  }
})
```

### All directives

```js
m-html      // renders HTML ⚠️
m-if        // conditional
m-show      // conditional
m-for       // loop
m-on:event  // event listener
  // .stop
  // .prevent
  // .ctrl
  // .shift
  // .alt
  // .enter
m-literal   // conserve value's property as literal JavaScript expression
m-model     // binding data to input value
```

### Instances

```js
this.get('property')
this.set('property', data)
this.methods('methodName', [data])
```

### Lifecycle

```js
new Mutable({
  el: '#app',
  hooks: {
    init() {}, // Mutable initialized
    mounted() {}, // First mount
    destroyed() {} // 💥
  }
})
```

### Data model

```html
<input m-model="beer" />
```

```js
new Mutable({
  el: '#app',
  data() {
    return {
      beer: 'IPA',
    }
  },
  hooks: {
    mounted() {
      this.set('beer', 'Stout')
    }
  },
})
```

Will fist render:

```html
<input value="IPA" />
```

Then on mount:

```html
<input value="Stout" />
```

### Components

You can create components using JavaScript's import / export:

```js
// Footer.js

export default {
  template:
    `<footer>
        <p><sup>&copy;</sup> 2016. MIT license.</p>
    </footer>`
}
```

```js
// main.js

import Footer from './components/Footer'
Mutable.component('copyright', Footer)
```

```html
<!-- index.html -->

...
<body id="app">
  <copyright />
  ...
</body>
```

You can use as many methods as needed:

```js
export default {
  props: [],
  template: '',
  data: {},
  methods: {},
  hooks: {},
}
```

#### Props

Passing props is as easy as registering and calling them as follows:

```html
<!-- index.html -->

<body id="app">
  <copyright year="2017" />
  ...
</body>
```

```js
// Footer.js

export default {
  props: ['year'],
  template:
    `<footer>
        <p><sup>&copy;</sup> {{ year }}. MIT license.</p>
    </footer>`
}

```

## Example

See `/example/index.html`, based in [this VueJS project](https://github.com/juanbrujo/vue-calculaasado)

## Development

Node v.10.15.1

### Commands:

```bash
npm i
npm run build
```

Build files will be created in `/dist`.

## License

This library is released under the [MIT license](https://github.com/mutable-tools/MutableJS/blob/master/LICENSE).
