/* Mutable v1.1.0 */

(function(root, factory) {
  (typeof module === "object" && module.exports) ? module.exports = factory() : root.Mutable = factory();
}(this, function() {
    "use strict";

    var directives = {};
    var specialDirectives = {};
    var components = {};
    var eventModifiersCode = {
      stop: 'event.stopPropagation();',
      prevent: 'event.preventDefault();',
      ctrl: 'if(event.ctrlKey === false) {return null;};',
      shift: 'if(event.shiftKey === false) {return null;};',
      alt: 'if(event.altKey === false) {return null;};',
      enter: 'if(event.keyCode !== 13) {return null;};'
    };
    var eventModifiers = {};

    var initMethods = function(instance, methods) {
      var data = instance.$data;

          var initMethod = function(methodName, method) {
        data[methodName] = function() {
          return method.apply(instance, arguments);
        }
      }

          for(var method in methods) {
        initMethod(method, methods[method]);
      }
    }

    var initComputed = function(instance, computed) {
      var setComputedProperty = function(prop) {
        var observer = instance.$observer;

        observer.observe(prop);

        Object.defineProperty(instance.$data, prop, {
          get: function() {
            var cache = null;

            if(observer.cache[prop] === undefined) {
              observer.target = prop;

              cache = computed[prop].get.call(instance);

              observer.target = null;

              observer.cache[prop] = cache;
            } else {
              cache = observer.cache[prop];
            }

                return cache;
          },
          set: noop
        });

        var setter = null;
        if((setter = computed[prop].set) !== undefined) {
          observer.setters[prop] = setter;
        }
      }

      for(var propName in computed) {
        setComputedProperty(propName);
      }
    }

        function Observer(instance) {
      this.instance = instance;

      this.cache = {};

      this.setters = {};

      this.clear = {};

      this.target = null;

      this.map = {};
    }

        Observer.prototype.observe = function(key) {
      var self = this;
      this.clear[key] = function() {
        self.cache[key] = undefined;
      }
    }

        Observer.prototype.notify = function(key, val) {
      var self = this;

          var depMap = null;
      if((depMap = this.map[key]) !== undefined) {
        for(var i = 0; i < depMap.length; i++) {
          self.notify(depMap[i]);
        }
      }

          var clear = null;
      if((clear = this.clear[key]) !== undefined) {
        clear();
      }
    }



        var hashRE = /\[(\w+)\]/g;
    var newLineRE = /\n/g;
    var doubleQuoteRE = /"/g;
    var HTMLEscapeRE = /&(?:lt|gt|quot|amp);/;
    var escapeRE = /(?:(?:&(?:lt|gt|quot|amp);)|"|\\|\n)/g;
    var escapeMap = {
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": "\\\"",
      "&amp;": "&",
      "\\": "\\\\",
      "\"": "\\\"",
      "\n": "\\n"
    }

    var log = function(msg) {
      if(Mutable.config.silent === false) {
        console.log(msg);
      }
    }

    var error = function(msg) {
      if(Mutable.config.silent === false) {
        console.error("Mutable ERROR: " + msg);
      }
    }

    var queueBuild = function(instance) {
      if(instance.$queued === false && instance.$destroyed === false) {
        instance.$queued = true;
        setTimeout(function() {
          instance.build();
          callHook(instance, 'updated');
          instance.$queued = false;
        }, 0);
      }
    }

    var resolveKeyPath = function(instance, obj, keypath, val) {
      keypath = keypath.replace(hashRE, '.$1');
      var path = keypath.split(".");
      var i = 0;
      for(; i < path.length - 1; i++) {
        var propName = path[i];
        obj = obj[propName];
      }
      obj[path[i]] = val;
      return path[0];
    }

    var callHook = function(instance, name) {
      var hook = instance.$hooks[name];
      if(hook !== undefined) {
        hook.call(instance);
      }
    }

    var getSlots = function(children) {
      var slots = {};

      var defaultSlotName = "default";
      slots[defaultSlotName] = [];

      if(children.length === 0) {
        return slots;
      }

      for(var i = 0; i < children.length; i++) {
        var child = children[i];
        var childProps = child.props.attrs;
        var slotName = "";
        var slotValue = null;

            if((slotName = childProps.slot) !== undefined) {
          slotValue = slots[slotName];
          if(slotValue === undefined) {
            slots[slotName] = [child];
          } else {
            slotValue.push(child);
          }
          delete childProps.slot;
        } else {
          slots[defaultSlotName].push(child);
        }
      }

          return slots;
    }

    var extend = function(parent, child) {
      for(var key in child) {
        parent[key] = child[key];
      }

          return parent;
    }

    var defineProperty = function(obj, prop, value, def) {
      if(value === undefined) {
        obj[prop] = def;
      } else {
        obj[prop] = value;
      }
    }

    var escapeString = function(str) {
      return str.replace(escapeRE, function(match) {
        return escapeMap[match];
      });
    }

    var noop = function() {

        }

    var extractAttrs = function(node) {
      var attrs = {};
      for(var rawAttrs = node.attributes, i = rawAttrs.length; i--;) {
        attrs[rawAttrs[i].name] = rawAttrs[i].value;
      }
      return attrs;
    }

    var addEventListeners = function(node, eventListeners) {
      var addHandler = function(type) {
        var handle = function(evt) {
          var handlers = handle.handlers;
          for(var i = 0; i < handlers.length; i++) {
            handlers[i](evt);
          }
        }

        handle.handlers = eventListeners[type];

        eventListeners[type] = handle;

        node.addEventListener(type, handle);
      }

          for(var type in eventListeners) {
        addHandler(type);
      }
    }

    var createNodeFromVNode = function(vnode) {
      var el = null;

          if(vnode.type === "#text") {
        el = document.createTextNode(vnode.val);
      } else {
        el = vnode.meta.isSVG ? document.createElementNS("http://www.w3.org/2000/svg", vnode.type) : document.createElement(vnode.type);
        if(vnode.children.length === 1 && vnode.children[0].type === "#text") {
          el.textContent = vnode.children[0].val;
          vnode.children[0].meta.el = el.firstChild;
        } else {
          for(var i = 0; i < vnode.children.length; i++) {
            var vchild = vnode.children[i];
            appendChild(createNodeFromVNode(vchild), vchild, el);
          }
        }
        var eventListeners = null;
        if((eventListeners = vnode.meta.eventListeners) !== undefined) {
          addEventListeners(el, eventListeners);
        }
      }

      diffProps(el, {}, vnode, vnode.props.attrs);

      vnode.meta.el = el;

          return el;
    }

    var appendChild = function(node, vnode, parent) {
      parent.appendChild(node);

      var component = null;
      if((component = vnode.meta.component) !== undefined) {
        createComponentFromVNode(node, vnode, component);
      }
    }

    var removeChild = function(node, parent) {
      var componentInstance = null;
      if((componentInstance = node.__mutable__) !== undefined) {
        componentInstance.destroy();
      }

      parent.removeChild(node);
    }

    var replaceChild = function(oldNode, newNode, vnode, parent) {
      var componentInstance = null;
      if((componentInstance = oldNode.__mutable__) !== undefined) {
        componentInstance.destroy();
      }

      parent.replaceChild(newNode, oldNode);

      var component = null;
      if((component = vnode.meta.component) !== undefined) {
        createComponentFromVNode(newNode, vnode, component);
      }
    }

    var TEXT_TYPE = "#text";

    var PATCH = {
      SKIP: 0,
      APPEND: 1,
      REMOVE: 2,
      REPLACE: 3,
      TEXT: 4,
      CHILDREN: 5
    }

    var defaultMetadata = function() {
      return {
        shouldRender: false
      }
    }

    var addEventListenerCodeToVNode = function(name, handler, vnode) {
      var meta = vnode.meta;
      var eventListeners = meta.eventListeners;
      if(eventListeners === undefined) {
        eventListeners = meta.eventListeners = {};
      }
      var eventHandlers = eventListeners[name];
      if(eventHandlers === undefined) {
        eventListeners[name] = [handler];
      } else {
        eventHandlers.push(handler);
      }
    }

    var createElement = function(type, val, props, meta, children) {
      return {
        type: type,
        val: val,
        props: props,
        children: children,
        meta: meta || defaultMetadata()
      };
    }

    var createFunctionalComponent = function(props, children, functionalComponent) {
      var options = functionalComponent.options;
      var attrs = props.attrs;
      var data = options.data;

          if(data === undefined) {
        data = {};
      }

      var propNames = options.props;
      if(propNames === undefined) {
        data = attrs;
      } else {
        for(var i = 0; i < propNames.length; i++) {
          var prop = propNames[i];
          data[prop] = attrs[prop];
        }
      }

      return functionalComponent.options.render(m, {
        data: data,
        slots: getSlots(children)
      });
    }

    var m = function(tag, attrs, meta, children) {
      var component = null;

          if(tag === TEXT_TYPE) {
        return createElement(TEXT_TYPE, meta, {attrs:{}}, attrs, []);
      } else if((component = components[tag]) !== undefined) {
        if(component.options.functional === true) {
          return createFunctionalComponent(attrs, children, component);
        } else {
          meta.component = component;
        }
      }

          return createElement(tag, "", attrs, meta, children);

    };

    var createComponentFromVNode = function(node, vnode, component) {
      var componentInstance = new component.CTor();
      var props = componentInstance.$props;
      var data = componentInstance.$data;
      var attrs = vnode.props.attrs;

      for(var i = 0; i < props.length; i++) {
        var prop = props[i];
        data[prop] = attrs[prop];
      }

      var eventListeners = vnode.meta.eventListeners;
      if(eventListeners !== undefined) {
        extend(componentInstance.$events, eventListeners);
      }

          componentInstance.$slots = getSlots(vnode.children);
      componentInstance.$el = node;
      componentInstance.build();
      callHook(componentInstance, 'mounted');

      vnode.meta.el = componentInstance.$el;

          return componentInstance.$el;
    }

    var diffEventListeners = function(node, eventListeners, oldEventListeners) {
      for(var type in eventListeners) {
        var oldEventListener = oldEventListeners[type];
        if(oldEventListener === undefined) {
          node.removeEventListener(type, oldEventListener);
        } else {
          oldEventListeners[type].handlers = eventListeners[type];
        }
      }
    }

    var diffProps = function(node, nodeProps, vnode) {
      var vnodeProps = vnode.props.attrs;

      for(var vnodePropName in vnodeProps) {
        var vnodePropValue = vnodeProps[vnodePropName];
        var nodePropValue = nodeProps[vnodePropName];

            if((vnodePropValue !== undefined && vnodePropValue !== false && vnodePropValue !== null) && ((nodePropValue === undefined || nodePropValue === false || nodePropValue === null) || vnodePropValue !== nodePropValue)) {
          if(vnodePropName.length === 10 && vnodePropName === "xlink:href") {
            node.setAttributeNS('http://www.w3.org/1999/xlink', "href", vnodePropValue);
          } else {
            node.setAttribute(vnodePropName, vnodePropValue === true ? '' : vnodePropValue);
          }
        }
      }

      for(var nodePropName in nodeProps) {
        var vnodePropValue$1 = vnodeProps[nodePropName];
        if(vnodePropValue$1 === undefined || vnodePropValue$1 === false || vnodePropValue$1 === null) {
          node.removeAttribute(nodePropName);
        }
      }

      var vnodeDirectives = null;
      if((vnodeDirectives = vnode.props.directives) !== undefined) {
        for(var directive in vnodeDirectives) {
          var directiveFn = null;
          if((directiveFn = directives[directive]) !== undefined) {
            directiveFn(node, vnodeDirectives[directive], vnode);
          }
        }
      }

      var dom = null;
      if((dom = vnode.props.dom) !== undefined) {
        for(var domProp in dom) {
          var domPropValue = dom[domProp];
          if(node[domProp] !== domPropValue) {
            node[domProp] = domPropValue;
          }
        }
      }
    }

    var diffComponent = function(node, vnode) {
      if(node.__mutable__ === undefined) {
        createComponentFromVNode(node, vnode, vnode.meta.component);
      } else {
        var componentInstance = node.__mutable__;
        var componentChanged = false;

        var props = componentInstance.$props;
        var data = componentInstance.$data;
        var attrs = vnode.props.attrs;
        for(var i = 0; i < props.length; i++) {
          var prop = props[i];
          if(data[prop] !== attrs[prop]) {
            data[prop] = attrs[prop];
            componentChanged = true;
          }
        }

        if(vnode.children.length !== 0) {
          componentInstance.$slots = getSlots(vnode.children);
          componentChanged = true;
        }

        if(componentChanged === true) {
          componentInstance.build();
        }
      }
    }

    var hydrate = function(node, vnode, parent) {
      var nodeName = node !== null ? node.nodeName.toLowerCase() : null;

          if(node === null) {
        var newNode = createNodeFromVNode(vnode);
        appendChild(newNode, vnode, parent);

            return newNode;
      } else if(vnode === null) {
        removeChild(node, parent);

            return null;
      } else if(nodeName !== vnode.type) {
        var newNode$1 = createNodeFromVNode(vnode);
        replaceChild(node, newNode$1, vnode, parent);
        return newNode$1;
      } else if(vnode.type === TEXT_TYPE) {
        if(nodeName === TEXT_TYPE) {
          if(node.textContent !== vnode.val) {
            node.textContent = vnode.val;
          }

          vnode.meta.el = node;
        } else {
          replaceChild(node, createNodeFromVNode(vnode), vnode, parent);
        }

            return node;
      } else {
        vnode.meta.el = node;

        if(vnode.meta.component !== undefined) {
          diffComponent(node, vnode);

          return node;
        }

        diffProps(node, extractAttrs(node), vnode);

        var eventListeners = null;
        if((eventListeners = vnode.meta.eventListeners) !== undefined) {
          addEventListeners(node, eventListeners);
        }

        var domProps = vnode.props.dom;
        if(domProps !== undefined && domProps.innerHTML !== undefined) {
          return node;
        }

        var children = vnode.children;
        var length = children.length;

            var i = 0;
        var currentChildNode = node.firstChild;
        var vchild = length !== 0 ? children[0] : null;

            while(vchild !== null || currentChildNode !== null) {
          var next = currentChildNode !== null ? currentChildNode.nextSibling : null;
          hydrate(currentChildNode, vchild, node);
          vchild = ++i < length ? children[i] : null;
          currentChildNode = next;
        }

            return node;
      }
    }

    var diff = function(oldVNode, vnode, parent) {
      if(oldVNode === null) {
        appendChild(createNodeFromVNode(vnode), vnode, parent);

            return PATCH.APPEND;
      } else if(vnode === null) {
        removeChild(oldVNode.meta.el, parent);

            return PATCH.REMOVE;
      } else if(oldVNode === vnode) {
        return PATCH.SKIP;
      } else if(oldVNode.type !== vnode.type) {
        replaceChild(oldVNode.meta.el, createNodeFromVNode(vnode), vnode, parent);

            return PATCH.REPLACE;
      } else if(vnode.meta.shouldRender === true && vnode.type === TEXT_TYPE) {
        var node = oldVNode.meta.el;

            if(oldVNode.type === TEXT_TYPE) {
          if(vnode.val !== oldVNode.val) {
            node.textContent = vnode.val;
          }

              return PATCH.TEXT;
        } else {
          replaceChild(node, createNodeFromVNode(vnode), vnode, parent);
          return PATCH.REPLACE;
        }

          } else if(vnode.meta.shouldRender === true) {
        var node$1 = oldVNode.meta.el;

        if(vnode.meta.component !== undefined) {
          diffComponent(node$1, vnode);

          return PATCH.SKIP;
        }

        diffProps(node$1, oldVNode.props.attrs, vnode);
        oldVNode.props.attrs = vnode.props.attrs;

        var eventListeners = null;
        if((eventListeners = vnode.meta.eventListeners) !== undefined) {
          diffEventListeners(node$1, eventListeners, oldVNode.meta.eventListeners);
        }

        var domProps = vnode.props.dom;
        if(domProps !== undefined && domProps.innerHTML !== undefined) {
          return PATCH.SKIP;
        }

        var children = vnode.children;
        var oldChildren = oldVNode.children;
        var newLength = children.length;
        var oldLength = oldChildren.length;

            if(newLength === 0) {
          if(oldLength !== 0) {
            var firstChild = null;
            while((firstChild = node$1.firstChild) !== null) {
              removeChild(firstChild, node$1);
            }
            oldVNode.children = [];
          }
        } else {
          var totalLen = newLength > oldLength ? newLength : oldLength;
          for(var i = 0, j = 0; i < totalLen; i++, j++) {
            var oldChild = j < oldLength ? oldChildren[j] : null;
            var child = i < newLength ? children[i] : null;

                var action = diff(oldChild, child, node$1);

            switch (action) {
              case PATCH.APPEND:
                oldChildren[oldLength++] = child;
                break;
              case PATCH.REMOVE:
                oldChildren.splice(j--, 1);
                oldLength--;
                break;
              case PATCH.REPLACE:
                oldChildren[j] = children[i];
                break;
              case PATCH.TEXT:
                oldChild.val = child.val;
                break;
            }
          }
        }

            return PATCH.CHILDREN;
      } else {
        vnode.meta.el = oldVNode.meta.el;
        return PATCH.SKIP;
      }
    }


    var openRE = /\{\{/;
    var closeRE = /\s*\}\}/;
    var whitespaceRE = /\s/;
    var expressionRE = /"[^"]*"|'[^']*'|\.\w*[a-zA-Z$_]\w*|\w*[a-zA-Z$_]\w*:|(\w*[a-zA-Z$_]\w*)/g;
    var globals = ['true', 'false', 'undefined', 'null', 'NaN', 'typeof', 'in'];

    var compileTemplate = function(template, dependencies, isString) {
      var state = {
        current: 0,
        template: template,
        output: "",
        dependencies: dependencies
      };

          compileTemplateState(state, isString);

          return state.output;
    }

        var compileTemplateState = function(state, isString) {
      var template = state.template;
      var length = template.length;
      while(state.current < length) {
        var value = scanTemplateStateUntil(state, openRE);

            if(value.length !== 0) {
          state.output += escapeString(value);
        }

        if(state.current === length) {
          break;
        }

        state.current += 2;

        scanTemplateStateForWhitespace(state);

        var name = scanTemplateStateUntil(state, closeRE);

        if(state.current === length) {
          if("development" !== "production") {
            error(("Expected closing delimiter \"}}\" after \"" + name + "\""));
          }
          break;
        }

            if(name.length !== 0) {
          compileTemplateExpression(name, state.dependencies);

          if(isString) {
            name = "\" + " + name + " + \"";
          }

          state.output += name;
        }

        scanTemplateStateForWhitespace(state);

        state.current += 2;
      }
    }

        var compileTemplateExpression = function(expr, dependencies) {
      expr.replace(expressionRE, function(match, reference) {
        if(reference !== undefined && dependencies.indexOf(reference) === -1 && globals.indexOf(reference) === -1) {
          dependencies.push(reference);
        }
      });

          return dependencies;
    }

        var scanTemplateStateUntil = function(state, re) {
      var template = state.template;
      var tail = template.substring(state.current);
      var length = tail.length;
      var idx = tail.search(re);

          var match = "";

          switch (idx) {
        case -1:
          match = tail;
          break;
        case 0:
          match = '';
          break;
        default:
          match = tail.substring(0, idx);
      }

          state.current += match.length;

          return match;
    }

        var scanTemplateStateForWhitespace = function(state) {
      var template = state.template;
      var char = template[state.current];
      while(whitespaceRE.test(char)) {
        char = template[++state.current];
      }
    }

        var tagOrCommentStartRE = /<\/?(?:[A-Za-z]+\w*)|<!--/;

        var lex = function(input) {
      var state = {
        input: input,
        current: 0,
        tokens: []
      }
      lexState(state);
      return state.tokens;
    }

        var lexState = function(state) {
      var input = state.input;
      var len = input.length;
      while(state.current < len) {
        if(input.charAt(state.current) !== "<") {
          lexText(state);
          continue;
        }

        if(input.substr(state.current, 4) === "<!--") {
          lexComment(state);
          continue;
        }

        lexTag(state);
      }
    }

        var lexText = function(state) {
      var current = state.current;
      var input = state.input;
      var len = input.length;

          var endOfText = input.substring(current).search(tagOrCommentStartRE);

          if(endOfText === -1) {
        state.tokens.push({
          type: "text",
          value: input.slice(current)
        });
        state.current = len;
        return;
      } else if(endOfText !== 0) {
        endOfText += current;
        state.tokens.push({
          type: "text",
          value: input.slice(current, endOfText)
        });
        state.current = endOfText;
      }
    }

        var lexComment = function(state) {
      var current = state.current;
      var input = state.input;
      var len = input.length;

          current += 4;

          var endOfComment = input.indexOf("-->", current);

          if(endOfComment === -1) {
        state.tokens.push({
          type: "comment",
          value: input.slice(current)
        });
        state.current = len;
      } else {
        state.tokens.push({
          type: "comment",
          value: input.slice(current, endOfComment)
        });
        state.current = endOfComment + 3;
      }
    }

        var lexTag = function(state) {
      var input = state.input;
      var len = input.length;

      var isClosingStart = input.charAt(state.current + 1) === "/";
      state.current += isClosingStart === true ? 2 : 1;

      var tagToken = lexTagType(state);
      lexAttributes(tagToken, state);

      var isClosingEnd = input.charAt(state.current) === "/";
      state.current += isClosingEnd === true ? 2 : 1;

      if(isClosingStart === true) {
        tagToken.closeStart = true;
      }

      if(isClosingEnd === true) {
        tagToken.closeEnd = true;
      }
    }

        var lexTagType = function(state) {
      var input = state.input;
      var len = input.length;
      var current = state.current;
      var tagType = "";
      while(current < len) {
        var char = input.charAt(current);
        if((char === "/") || (char === ">") || (char === " ")) {
          break;
        } else {
          tagType += char;
        }
        current++;
      }

          var tagToken = {
        type: "tag",
        value: tagType
      };

          state.tokens.push(tagToken);

          state.current = current;
      return tagToken;
    }

        var lexAttributes = function(tagToken, state) {
      var input = state.input;
      var len = input.length;
      var current = state.current;
      var char = input.charAt(current);
      var nextChar = input.charAt(current + 1);

          var incrementChar = function() {
        current++;
        char = input.charAt(current);
        nextChar = input.charAt(current + 1);
      }

          var attributes = {};

          while(current < len) {
        if((char === ">") || (char === "/" && nextChar === ">")) {
          break;
        }

        if(char === " ") {
          incrementChar();
          continue;
        }

        var attrName = "";
        var noValue = false;

            while(current < len && char !== "=") {
          if((char === " ") || (char === ">") || (char === "/" && nextChar === ">")) {
            noValue = true;
            break;
          } else {
            attrName += char;
          }
          incrementChar();
        }

            var attrValue = {
          name: attrName,
          value: "",
          meta: {}
        }

            if(noValue === true) {
          attributes[attrName] = attrValue;
          continue;
        }

        incrementChar();

        var quoteType = " ";
        if(char === "'" || char === "\"") {
          quoteType = char;

          incrementChar();
        }

        while(current < len && char !== quoteType) {
          attrValue.value += char;
          incrementChar();
        }

        incrementChar();

        var argIndex = attrName.indexOf(":");
        if(argIndex !== -1) {
          var splitAttrName = attrName.split(":");
          attrValue.name = splitAttrName[0];
          attrValue.meta.arg = splitAttrName[1];
        }

        attributes[attrName] = attrValue;
      }

          state.current = current;
      tagToken.attributes = attributes;
    }

        var parse = function(tokens) {
      var root = {
        type: "ROOT",
        children: []
      }

          var state = {
        current: 0,
        tokens: tokens
      }

          while(state.current < tokens.length) {
        var child = parseWalk(state);
        if(child) {
          root.children.push(child);
        }
      }

          return root;
    }

        var VOID_ELEMENTS = ["area","base","br","command","embed","hr","img","input","keygen","link","meta","param","source","track","wbr"];
    var SVG_ELEMENTS = ["svg","animate","circle","clippath","cursor","defs","desc","ellipse","filter","font-face","foreignObject","g","glyph","image","line","marker","mask","missing-glyph","path","pattern","polygon","polyline","rect","switch","symbol","text","textpath","tspan","use","view"];

        var createParseNode = function(type, props, children) {
      return {
        type: type,
        props: props,
        children: children
      }
    }

        var parseWalk = function(state) {
      var token = state.tokens[state.current];
      var previousToken = state.tokens[state.current - 1];
      var nextToken = state.tokens[state.current + 1];

          var move = function(num) {
        state.current += num === undefined ? 1 : num;
        token = state.tokens[state.current];
        previousToken = state.tokens[state.current - 1];
        nextToken = state.tokens[state.current + 1];
      }

          if(token.type === "text") {
        move();
        return previousToken.value;
      }

          if(token.type === "comment") {
        move();
        return null;
      }

      if(token.type === "tag") {
        var tagType = token.value;
        var closeStart = token.closeStart;
        var closeEnd = token.closeEnd;

            var isSVGElement = SVG_ELEMENTS.indexOf(tagType) !== -1;
        var isVoidElement = VOID_ELEMENTS.indexOf(tagType) !== -1 || closeEnd === true;

            var node = createParseNode(tagType, token.attributes, []);

            move();

        if(isSVGElement) {
          node.isSVG = true;
        }

            if(isVoidElement === true) {
          return node;
        } else if(closeStart === true) {
          if("development" !== "production") {
            error(("Could not locate opening tag for the element \"" + (node.type) + "\""));
          }
          return null;
        } else if(token !== undefined) {
          var current = state.current;
          while((token.type !== "tag") || ((token.type === "tag") && ((token.closeStart === undefined && token.closeEnd === undefined) || (token.value !== tagType)))) {
            var parsedChildState = parseWalk(state);
            if(parsedChildState !== null) {
              node.children.push(parsedChildState);
            }

                move(0);

                if(token === undefined) {
              if("development" !== "production") {
                error(("The element \"" + (node.type) + "\" was left unclosed"));
              }
              break;
            }
          }

              move();
        }

            return node;
      }

          move();
      return;
    }

        var generateProps = function(node, parent, state) {
    	var props = node.props;
    	node.props = {
    		attrs: props
    	}

        	var hasDirectives = false;
    	var directiveProps = [];

        	var hasSpecialDirectivesAfter = false;
    	var specialDirectivesAfter = {};

        	var propKey = null;
    	var specialDirective = null;

        	var propsCode = "{attrs: {";

        	var beforeGenerate = null;
    	for(propKey in props) {
    		var prop = props[propKey];
    		var name = prop.name;
    		if((specialDirective = specialDirectives[name]) !== undefined && (beforeGenerate = specialDirective.beforeGenerate) !== undefined) {
    			beforeGenerate(prop, node, parent, state);
    		}
    	}

        	var afterGenerate = null;
    	var duringPropGenerate = null;
    	for(propKey in props) {
    		var prop$1 = props[propKey];
    		var name$1 = prop$1.name;

        		if((specialDirective = specialDirectives[name$1]) !== undefined) {
    			if((afterGenerate = specialDirective.afterGenerate) !== undefined) {
    				specialDirectivesAfter[name$1] = {
    					prop: prop$1,
    					afterGenerate: afterGenerate
    				};

        				hasSpecialDirectivesAfter = true;
    			}

        			if((duringPropGenerate = specialDirective.duringPropGenerate) !== undefined) {
    				propsCode += duringPropGenerate(prop$1, node, state);
    			}

        			node.meta.shouldRender = true;
    		} else if(name$1[0] === "m" && name$1[1] === "-") {
    			directiveProps.push(prop$1);
    			hasDirectives = true;
    			node.meta.shouldRender = true;
    		} else {
    			var value = prop$1.value;
    			var compiled = compileTemplate(value, state.dependencies, true);

        			if(value !== compiled) {
    				node.meta.shouldRender = true;
    			}

        			if(state.hasAttrs === false) {
    				state.hasAttrs = true;
    			}

        			propsCode += "\"" + propKey + "\": \"" + compiled + "\", ";
    		}
    	}

        	if(state.hasAttrs === true) {
    		propsCode = propsCode.substring(0, propsCode.length - 2) + "}";
    		state.hasAttrs = false;
    	} else {
    		propsCode += "}";
    	}

        	if(hasDirectives === true) {
    		propsCode += ", directives: {";

        		var directiveProp = null;
    		var directivePropValue = null;
    		for(var i = 0; i < directiveProps.length; i++) {
    			directiveProp = directiveProps[i];
    			directivePropValue = directiveProp.value;

        			compileTemplateExpression(directivePropValue, state.dependencies);
    			propsCode += "\"" + (directiveProp.name) + "\": " + (directivePropValue.length === 0 ? "\"\"" : directivePropValue) + ", ";
    		}

        		propsCode = propsCode.substring(0, propsCode.length - 2) + "}";
    	}

        	if(hasSpecialDirectivesAfter === true) {
    		state.specialDirectivesAfter = specialDirectivesAfter;
    	}

        	var domProps = node.props.dom;
    	if(domProps !== undefined) {
    		propsCode += ", dom: {";

        		for(var domProp in domProps) {
    			propsCode += "\"" + domProp + "\": " + (domProps[domProp]) + ", ";
    		}

        		propsCode = propsCode.substring(0, propsCode.length - 2) + "}";
    	}

        	propsCode += "}, ";

        	return propsCode;
    }

        var generateEventlisteners = function(eventListeners) {
    	var eventListenersCode = "\"eventListeners\": {";

        	for(var type in eventListeners) {
    		var handlers = eventListeners[type];
    		eventListenersCode += "\"" + type + "\": [";

        		for(var i = 0; i < handlers.length; i++) {
    			eventListenersCode += (handlers[i]) + ", ";
    		}

        		eventListenersCode = eventListenersCode.substring(0, eventListenersCode.length - 2) + "], ";
    	}

        	eventListenersCode = eventListenersCode.substring(0, eventListenersCode.length - 2) + "}, ";
    	return eventListenersCode;
    }

        var generateMeta = function(meta) {
    	var metaCode = "{";
    	for(var key in meta) {
    		if(key === "eventListeners") {
    			metaCode += generateEventlisteners(meta[key])
    		} else {
    			metaCode += "\"" + key + "\": " + (meta[key]) + ", ";
    		}
    	}

        	metaCode = metaCode.substring(0, metaCode.length - 2) + "}, ";
    	return metaCode;
    }

        var generateNode = function(node, parent, state) {
    	if(typeof node === "string") {
    		var compiled = compileTemplate(node, state.dependencies, true);
    		var meta = defaultMetadata();

        		if(node !== compiled) {
    			meta.shouldRender = true;
    			parent.meta.shouldRender = true;
    		}

        		return ("m(\"#text\", " + (generateMeta(meta)) + "\"" + compiled + "\")");
    	} else if(node.type === "slot") {
    		parent.meta.shouldRender = true;
    		parent.deep = true;

        		var slotName = node.props.name;
    		return ("instance.$slots[\"" + (slotName === undefined ? "default" : slotName.value) + "\"]");
    	} else {
    		var call = "m(\"" + (node.type) + "\", ";

        		var meta$1 = defaultMetadata();
    		node.meta = meta$1;

        		var propsCode = generateProps(node, parent, state);
    		var specialDirectivesAfter = state.specialDirectivesAfter;

        		if(specialDirectivesAfter !== null) {
    			state.specialDirectivesAfter = null;
    		}

        		var children = node.children;
    		var childrenLength = children.length;
    		var childrenCode = "[";

        		if(childrenLength === 0) {
    			childrenCode += "]";
    		} else {
    			for(var i = 0; i < children.length; i++) {
    				childrenCode += (generateNode(children[i], node, state)) + ", ";
    			}
    			childrenCode = childrenCode.substring(0, childrenCode.length - 2) + "]";
    		}

        		if(node.deep === true) {
    			childrenCode = "[].concat.apply([], " + childrenCode + ")";
    		}

        		if(node.meta.shouldRender === true && parent !== undefined) {
    			parent.meta.shouldRender = true;
    		}

        		call += propsCode;
    		call += generateMeta(meta$1);
    		call += childrenCode;
    		call += ")";

        		if(specialDirectivesAfter !== null) {
    			var specialDirectiveAfter;
    			for(var specialDirectiveKey in specialDirectivesAfter) {
    				specialDirectiveAfter = specialDirectivesAfter[specialDirectiveKey];
    				call = specialDirectiveAfter.afterGenerate(specialDirectiveAfter.prop, call, node, state);
    			}
    		}

        		return call;
    	}
    }

        var generate = function(tree) {
    	var root = tree.children[0];

        	var state = {
    		hasAttrs: false,
    		specialDirectivesAfter: null,
    		dependencies: []
    	};

        	var rootCode = generateNode(root, undefined, state);

        	var dependencies = state.dependencies;
    	var dependenciesCode = "";

        	for(var i = 0; i < dependencies.length; i++) {
    		var dependency = dependencies[i];
    		dependenciesCode += "var " + dependency + " = instance.get(\"" + dependency + "\"); ";
    	}

        	var code = "var instance = this; " + dependenciesCode + "return " + rootCode + ";";

        	try {
        return new Function("m", code);
      } catch(e) {
        error("Could not create render function");
        return noop;
      }
    }

        var compile = function(template) {
      var tokens = lex(template);
      var ast = parse(tokens);
      return generate(ast);
    }


            function Mutable(options) {

        if(options === undefined) {
          options = {};
        }
        this.$options = options;

        defineProperty(this, "$name", options.name, "root");

        var data = options.data;
        if(data === undefined) {
          this.$data = {};
        } else if(typeof data === "function") {
          this.$data = data();
        } else {
          this.$data = data;
        }

        defineProperty(this, "$render", options.render, noop);

        defineProperty(this, "$hooks", options.hooks, {});

        var methods = options.methods;
        if(methods !== undefined) {
          initMethods(this, methods);
        }

        this.$events = {};

        this.$dom = {};

        this.$observer = new Observer(this);

        this.$destroyed = true;

        this.$queued = false;

        var computed = options.computed;
        if(computed !== undefined) {
          initComputed(this, computed);
        }

        this.init();
    }


    Mutable.prototype.get = function(key) {
      var observer = this.$observer;
      var target = null;
      if((target = observer.target) !== null) {
        if(observer.map[key] === undefined) {
          observer.map[key] = [target];
        } else if(observer.map[key].indexOf(target) === -1) {
          observer.map[key].push(target);
        }
      }

      if("development" !== "production" && !(key in this.$data)) {
        error(("The item \"" + key + "\" was not defined but was referenced"));
      }
      return this.$data[key];
    }

    Mutable.prototype.set = function(key, val) {
      var observer = this.$observer;

      var base = resolveKeyPath(this, this.$data, key, val);

      var setter = null;
      if((setter = observer.setters[base]) !== undefined) {
        setter.call(this, val);
      }

      observer.notify(base, val);

      queueBuild(this);
    }

    Mutable.prototype.destroy = function() {
      this.off();

      this.$el = null;

      this.$destroyed = true;

      callHook(this, 'destroyed');
    }

    Mutable.prototype.methods = function(method, args) {
      args = args || [];

      return this.$data[method].apply(this, args);
    }


    Mutable.prototype.on = function(eventName, handler) {
      var handlers = this.$events[eventName];

          if(handlers === undefined) {
        this.$events[eventName] = [handler];
      } else {
        handlers.push(handler);
      }
    }

    Mutable.prototype.off = function(eventName, handler) {
      if(eventName === undefined) {
        this.$events = {};
      } else if(handler === undefined) {
        this.$events[eventName] = [];
      } else {
        var handlers = this.$events[eventName];

        var index = handlers.indexOf(handler);

        handlers.splice(index, 1);
      }
    }

    Mutable.prototype.emit = function(eventName, customMeta) {
      var meta = customMeta || {};
      meta.type = eventName;

      var handlers = this.$events[eventName];
      var globalHandlers = this.$events["*"];

      var i = 0;

      if(handlers !== undefined) {
        for(i = 0; i < handlers.length; i++) {
          handlers[i](meta);
        }
      }

          if(globalHandlers !== undefined) {
        for(i = 0; i < globalHandlers.length; i++) {
          globalHandlers[i](meta);
        }
      }
    }

    Mutable.prototype.mount = function(el) {
      this.$el = typeof el === 'string' ? document.querySelector(el) : el;

      this.$destroyed = false;

          if("development" !== "production" && this.$el === null) {
        error("Element " + this.$options.el + " not found");
      }

      this.$el.__mutable__ = this;

      defineProperty(this, "$template", this.$options.template, this.$el.outerHTML);

      if(this.$render === noop) {
        this.$render = Mutable.compile(this.$template);
      }

      this.build();

      callHook(this, 'mounted');
    }

    Mutable.prototype.render = function() {
      return this.$render(m);
    }

    Mutable.prototype.patch = function(old, vnode, parent) {
      if(old.meta !== undefined) {
        if(vnode.type !== old.type) {
          var newRoot = createNodeFromVNode(vnode);
          replaceChild(old.meta.el, newRoot, vnode, parent);

          newRoot.__mutable__ = this;
          this.$el = newRoot;
        } else {
          diff(old, vnode, parent);
        }

          } else if(old instanceof Node) {
        var newNode = hydrate(old, vnode, parent);

            if(newNode !== old) {
          this.$el = vnode.meta.el;
          this.$el.__mutable__ = this;
        }
      }
    }

    Mutable.prototype.build = function() {
      var dom = this.render();

      var old = null;

          if(this.$dom.meta !== undefined) {
        old = this.$dom;
      } else {
        old = this.$el;
        this.$dom = dom;
      }

      this.patch(old, dom, this.$el.parentNode);
    }

    Mutable.prototype.init = function() {
      log("======= Mutable =======");
      callHook(this, 'init');

          var el = this.$options.el;
      if(el !== undefined) {
        this.mount(el);
      }
    }



    Mutable.config = {
      silent: ("development" === "production") || (typeof console === 'undefined'),
      keyCodes: function(keyCodes) {
        extend(eventModifiers, keyCodes);
      }
    }

    Mutable.version = '1.1.0';

    Mutable.util = {
      noop: noop,
      error: error,
      log: log,
      extend: extend,
      m: m
    }

    Mutable.use = function(plugin, options) {
      plugin.init(Mutable, options);
    }

    Mutable.compile = function(template) {
      return compile(template);
    }

    Mutable.nextTick = function(task) {
      setTimeout(task, 0);
    }

    Mutable.directive = function(name, action) {
      directives["m-" + name] = action;
    }

    Mutable.component = function(name, options) {
      var Parent = this;

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

            var options = this.$options;
        this.$destroyed = false;
        defineProperty(this, "$props", options.props, []);

            var template = options.template;
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

    Mutable.renderClass = function(classNames) {
      if(typeof classNames === "string") {
        return classNames;
      }

          var renderedClassNames = "";
      if(Array.isArray(classNames)) {
        for(var i = 0; i < classNames.length; i++) {
          renderedClassNames += (Mutable.renderClass(classNames[i])) + " ";
        }
      } else if(typeof classNames === "object") {
        for(var className in classNames) {
          if(classNames[className]) {
            renderedClassNames += className + " ";
          }
        }
      }

      renderedClassNames = renderedClassNames.slice(0, -1);
      return renderedClassNames;
    }

    Mutable.renderLoop = function(iteratable, item) {
      var items = null;

          if(Array.isArray(iteratable)) {
        items = new Array(iteratable.length);

        for(var i = 0; i < iteratable.length; i++) {
          items[i] = item(iteratable[i], i);
        }
      } else if(typeof iteratable === "object") {
        items = [];

        for(var key in iteratable) {
          items.push(item(iteratable[key], key));
        }
      } else if(typeof iteratable === "number") {
        items = new Array(iteratable);

        for(var i$1 = 0; i$1 < iteratable; i$1++) {
          items[i$1] = item(i$1 + 1, i$1);
        }
      }

          return items;
    }

     Mutable.renderEventModifier = function(keyCode, modifier) {
      return keyCode === eventModifiers[modifier];
     }



        var emptyVNode = "m(\"#text\", " + (generateMeta(defaultMetadata())) + "\"\")";

        specialDirectives["m-if"] = {
      afterGenerate: function(prop, code, vnode, state) {
        var value = prop.value;
        compileTemplateExpression(value, state.dependencies);
        return (value + " ? " + code + " : " + emptyVNode);
      }
    }

        specialDirectives["m-for"] = {
      beforeGenerate: function(prop, vnode, parentVNode, state) {
        parentVNode.deep = true;
      },
      afterGenerate: function(prop, code, vnode, state) {
        var dependencies = state.dependencies;

        var parts = prop.value.split(" in ");

        var aliases = parts[0].split(",");

        var iteratable = parts[1];
        compileTemplateExpression(iteratable, dependencies);

        var params = aliases.join(",");

        for(var i = 0; i < aliases.length; i++) {
          var aliasIndex = dependencies.indexOf(aliases[i]);
          if(aliasIndex !== -1) {
            dependencies.splice(aliasIndex, 1);
          }
        }

        return ("Mutable.renderLoop(" + iteratable + ", function(" + params + ") { return " + code + "; })");
      }
    }

        specialDirectives["m-on"] = {
      beforeGenerate: function(prop, vnode, parentVNode, state) {
        var value = prop.value;
        var meta = prop.meta;

            var methodToCall = value;

            var rawModifiers = meta.arg.split(".");
        var eventType = rawModifiers.shift();

            var params = "event";
        var rawParams = methodToCall.split("(");

            if(rawParams.length > 1) {
          methodToCall = rawParams.shift();
          params = rawParams.join("(").slice(0, -1);
          compileTemplateExpression(params, state.dependencies);
        }

        var modifiers = "";
        for(var i = 0; i < rawModifiers.length; i++) {
          var eventModifierCode = eventModifiersCode[rawModifiers[i]];
          if(eventModifierCode === undefined) {
            modifiers += "if(Mutable.renderEventModifier(event.keyCode, \"" + (rawModifiers[i]) + "\") === false) {return null;};"
          } else {
            modifiers += eventModifierCode;
          }
        }

        var code = "function(event) {" + modifiers + "instance.methods(\"" + methodToCall + "\", [" + params + "])}";
        addEventListenerCodeToVNode(eventType, code, vnode);
      }
    }

        specialDirectives["m-model"] = {
      beforeGenerate: function(prop, vnode, parentVNode, state) {
        var value = prop.value;
        var attrs = vnode.props.attrs;

        var dependencies = state.dependencies;

        compileTemplateExpression(value, dependencies);

        var eventType = "input";
        var domGetter = "value";
        var domSetter = value;
        var keypathGetter = value;
        var keypathSetter = "event.target." + domGetter;

        var type = attrs.type;
        if(type !== undefined) {
          type = type.value;
          var radio = false;
          if(type === "checkbox" || (type === "radio" && (radio = true))) {
            eventType = "change";
            domGetter = "checked";

                if(radio === true) {
              var valueAttr = attrs.value;
              var originalValueAttr = null;
              var valueAttrValue = "null";
              if(valueAttr !== undefined) {
                valueAttrValue = "\"" + (compileTemplate(valueAttr.value, dependencies, true)) + "\"";
              } else if((originalValueAttr = attrs["m-original:value"])) {
                valueAttrValue = "" + (compileTemplate(originalValueAttr.value, dependencies, true));
              }
              domSetter = domSetter + " === " + valueAttrValue;
              keypathSetter = valueAttrValue;
            } else {
              keypathSetter = "event.target." + domGetter;
            }
          }
        }

        var bracketIndex = keypathGetter.indexOf("[");
        var dotIndex = keypathGetter.indexOf(".");
        var base = null;
        var dynamicPath = null;
        var dynamicIndex = -1;

            if(bracketIndex !== -1 || dotIndex !== -1) {
          if(bracketIndex === -1) {
            dynamicIndex = dotIndex;
          } else if(dotIndex === -1) {
            dynamicIndex = bracketIndex;
          } else if(bracketIndex < dotIndex) {
            dynamicIndex = bracketIndex;
          } else {
            dynamicIndex = dotIndex;
          }
          base = value.substring(0, dynamicIndex);
          dynamicPath = value.substring(dynamicIndex);

          keypathGetter = base + dynamicPath.replace(expressionRE, function(match, reference) {
            if(reference !== undefined) {
              return ("\" + " + reference + " + \"");
            } else {
              return match;
            }
          });
        }

        var code = "function(event) {instance.set(\"" + keypathGetter + "\", " + keypathSetter + ")}";

        addEventListenerCodeToVNode(eventType, code, vnode);

        var dom = vnode.props.dom;
        if(dom === undefined) {
          vnode.props.dom = dom = {};
        }
        dom[domGetter] = domSetter;
      }
    };

        specialDirectives["m-original"] = {
      duringPropGenerate: function(prop, vnode, state) {
        var propName = prop.meta.arg;
        var propValue = prop.value;
        compileTemplateExpression(propValue, state.dependencies);

            if(state.hasAttrs === false) {
          state.hasAttrs = true;
        }

            if(propName === "class") {
          return ("\"class\": Mutable.renderClass(" + propValue + "), ");
        } else {
          return ("\"" + propName + "\": " + propValue + ", ");
        }
      }
    };

        specialDirectives["m-html"] = {
      beforeGenerate: function(prop, vnode, parentVNode, state) {
        var value = prop.value;
        var dom = vnode.props.dom;
        if(dom === undefined) {
          vnode.props.dom = dom = {};
        }
        compileTemplateExpression(value, state.dependencies);
        dom.innerHTML = "(\"\" + " + value + ")";
      }
    }

        specialDirectives["m-mask"] = {

        }

        directives["m-show"] = function(el, val, vnode) {
      el.style.display = (val ? '' : 'none');
    }


            return Mutable;
}));
