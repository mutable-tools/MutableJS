/* ======= Global API ======= */

/**
 * Configuration of Mutable
 */
Mutable.config = {
  silent: ("__ENV__" === "production") || (typeof console === 'undefined'),
  keyCodes: function(keyCodes) {
    extend(eventModifiers, keyCodes);
  }
}

/**
 * Version of Mutable
 */
Mutable.version = '__VERSION__';

/**
 * Mutable Utilities
 */
Mutable.util = {
  noop: noop,
  error: error,
  log: log,
  extend: extend,
  m: m
}

/**
 * Runs an external Plugin
 * @param {Object} plugin
 * @param {Object} options
 */
Mutable.use = function(plugin, options) {
  plugin.init(Mutable, options);
}

/**
 * Compiles HTML to a Render Function
 * @param {String} template
 * @return {Function} render function
 */
Mutable.compile = function(template) {
  return compile(template);
}

/**
 * Runs a Task After Update Queue
 * @param {Function} task
 */
Mutable.nextTick = function(task) {
  setTimeout(task, 0);
}

/**
 * Creates a Directive
 * @param {String} name
 * @param {Function} action
 */
Mutable.directive = function(name, action) {
  directives["m-" + name] = action;
}

/**
 * Creates a Component
 * @param {String} name
 * @param {Object} options
 */
Mutable.component = function(name, options) {
  let Parent = this;

  if(options.name !== undefined) {
    name = options.name;
  } else {
    options.name = name;
  }

  if(options.data !== undefined && typeof options.data !== "function") {
    error("In components, data must be a function returning an object");
  }

  function MutableComponent() {
    Mutable.call(this, options);
  }

  MutableComponent.prototype = Object.create(Parent.prototype);
  MutableComponent.prototype.constructor = MutableComponent;

  MutableComponent.prototype.init = function() {
    callHook(this, 'init');

    const options = this.$options;
    this.$destroyed = false;
    defineProperty(this, "$props", options.props, []);

    const template = options.template;
    this.$template = template;

    if(this.$render === noop) {
      this.$render = Mutable.compile(template);
    }
  }

  components[name] = {
    CTor: MutableComponent,
    options: options
  };

  return MutableComponent;
}

/**
 * Renders a Class in Array/Object Form
 * @param {Array|Object|String} classNames
 * @return {String} renderedClassNames
 */
Mutable.renderClass = function(classNames) {
  if(typeof classNames === "string") {
    // If they are a string, no need for any more processing
    return classNames;
  }

  let renderedClassNames = "";
  if(Array.isArray(classNames)) {
    // It's an array, so go through them all and generate a string
    for(let i = 0; i < classNames.length; i++) {
      renderedClassNames += `${Mutable.renderClass(classNames[i])} `;
    }
  } else if(typeof classNames === "object") {
    // It's an object, so to through and render them to a string if the corresponding condition is truthy
    for(let className in classNames) {
      if(classNames[className]) {
        renderedClassNames += `${className} `;
      }
    }
  }

  // Remove trailing space and return
  renderedClassNames = renderedClassNames.slice(0, -1);
  return renderedClassNames;
}

/**
 * Renders "m-for" Directive Array
 * @param {Array|Object|Number} iteratable
 * @param {Function} item
 */
Mutable.renderLoop = function(iteratable, item) {
  let items = null;

  if(Array.isArray(iteratable)) {
    items = new Array(iteratable.length);

    // Iterate through the array
    for(let i = 0; i < iteratable.length; i++) {
      items[i] = item(iteratable[i], i);
    }
  } else if(typeof iteratable === "object") {
    items = [];

    // Iterate through the object
    for(let key in iteratable) {
      items.push(item(iteratable[key], key));
    }
  } else if(typeof iteratable === "number") {
    items = new Array(iteratable);

    // Repeat a certain amount of times
    for(let i = 0; i < iteratable; i++) {
      items[i] = item(i + 1, i);
    }
  }

  return items;
}

/**
 * Renders an Event Modifier
 * @param {Number} keyCode
 * @param {String} modifier
 */
 Mutable.renderEventModifier = function(keyCode, modifier) {
  return keyCode === eventModifiers[modifier];
 }
