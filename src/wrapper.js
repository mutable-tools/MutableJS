(function(root, factory) {
  /* ======= Global Mutable ======= */
  (typeof module === "object" && module.exports) ? module.exports = factory() : root.Mutable = factory();
}(this, function() {
    //=require ../dist/mutable.js
    return Mutable;
}));
