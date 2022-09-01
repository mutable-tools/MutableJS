'use strict';

const gulp = require('gulp');
const buble = require('buble');
const uglify = require('gulp-uglify');
const replace = require('gulp-replace');
const include = require('gulp-include');
const concat = require('gulp-concat');
const header = require('gulp-header');
const size = require('gulp-size');
const strip = require('gulp-strip-comments');
const Transform = require('stream').Transform;

const pkg = require('./package.json');
const comment = `/* Mutable v${pkg.version} */\r\n`;

const gulpBubble = function(options) {
  return new Transform({
    objectMode: true,
    transform: function(file, encoding, callback) {
      if(!file.isStream()) {
        if(options === undefined) {
          options = {};
        }

        let result = null;
        try {
          result = buble.transform(file.contents.toString(), options);
        } catch(e) {
          throw new Error("[Bubble] Error: " + e);
        }

        file.contents = new Buffer(result.code);

        callback(null, file);
      }
    }
  });
};

// Build
gulp.task('transpile', function() {
  return gulp.src(['./src/index.js'])
    .pipe(include())
    .pipe(gulpBubble({
      namedFunctionExpressions: false,
      transforms: {
        arrow: true,
        classes: false,
        collections: false,
        computedProperty: false,
        conciseMethodProperty: false,
        constLoop: false,
        dangerousForOf: false,
        dangerousTaggedTemplateString: false,
        defaultParameter: false,
        destructuring: false,
        forOf: false,
        generator: false,
        letConst: true,
        modules: false,
        numericLiteral: false,
        parameterDestructuring: false,
        reservedProperties: false,
        spreadRest: false,
        stickyRegExp: false,
        templateString: true,
        unicodeRegExp: false
      }
    }))
    .pipe(concat('mutable.js'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('build', ['transpile'], function() {
  return gulp.src(['./src/wrapper.js'])
    .pipe(include())
    .pipe(concat('mutable.js'))
    .pipe(strip())
    .pipe(header(comment + '\n'))
    .pipe(replace('__VERSION__', pkg.version))
    .pipe(replace('__ENV__', "development"))
    .pipe(size())
    .pipe(gulp.dest('./dist/'));
});

// Build minified
gulp.task('minify', ['build'], function() {
  return gulp.src(['./dist/mutable.js'])
    .pipe(replace('"development"', '"production"'))
    .pipe(uglify())
    .pipe(header(comment))
    .pipe(size())
    .pipe(size({
      gzip: true
    }))
    .pipe(concat('mutable.min.js'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('default', ['build', 'minify']);
