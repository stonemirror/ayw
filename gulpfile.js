var gulp = require('gulp');
//
// Utility functions
//
var debug = require('gulp-debug');
var gutil = require('gulp-util');
var gulpIf = require('gulp-if');
var fs = require('fs');
var del = require('del');
var runSequence = require('run-sequence');
///
// Optimization
//
var cache = require('gulp-cache');
var newer = require('gulp-newer');

//
// Error handling and notification
//
var plumber = require('gulp-plumber');
var notify = require('gulp-notify');

function customPlumber(errTitle) {
    if (process.env.CI) {
        return plumber({
            errorHandler: function(err) {
                throw Error(gutil.colors.red(err.message));
            }
        });
    }
    else {
        return plumber({
            errorHandler: notify.onError({
              title: errTitle || "Error running Gulp",
              message: "Error: <%= error.message %>",
              sound: "Glass"
            })
        });
    }
}

//
// Browser sync
//
var browserSync = require('browser-sync');

gulp.task('browserSync', function() {
    browserSync({
        server: {
            baseDir: 'app'
        },
    })
});

//
// SCSS compilation and linting
//
var sass = require('gulp-sass');
var scssLint = require('gulp-scss-lint');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('sass', function() {
    return gulp.src('app/scss/**/*.scss')
        .pipe(customPlumber('Error running Sass'))
        .pipe(sourcemaps.init())
        .pipe(sass({
            includePaths: ['app/bower_components']
        }))
        .pipe(autoprefixer())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('app/css'))
        .pipe(browserSync.reload({
            stream: true
        }))
});

gulp.task('lint:scss', function() {
    return gulp.src('app/scss/**/*.scss')
        .pipe(scssLint({
            config: '.scss-lint.yml'
        }));
})

//
// Javascript linting
//
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');

gulp.task('lint:js', function() {
    return gulp.src('app/js/**/*.js')
      .pipe(customPlumber('Error running JShint'))
      .pipe(jshint())
      .pipe(jshint.reporter('jshint-stylish'))
      .pipe(jshint.reporter('fail', {
          ignoreWarning: true,
          ignoreInfo: true
      }))
      .pipe(jscs({
          fix: true,
          configPath: '.jscsrc'
      }))
      .pipe(gulp.dest('app/js'));
})

eslint = require('gulp-eslint');

gulp.task('eslint', function() {
  return gulp.src('app/js/**/*.js')
    .pipe(customPlumber('ESLint error!'))
    .pipe(eslint({
      fix: true,
      globals: [
        "$"
      ]
    }))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .pipe(gulp.dest('app/js'));
});

//
// Image optimization: sprites
//
var spritesmith = require('gulp.spritesmith');

gulp.task('sprites', function() {
    gulp.src('app/images/sprites/**/*')
      .pipe(spritesmith({
          cssName: '_sprites.scss',
          imgName: 'sprites.png',
          imgPath: '../images/sprites.png',
          retinaSrcFilter: 'app/images/sprites/*@2x.png',
          retinaImgName: 'sprites@2x.png',
          retinaImgPath: '../images/sprites@2x.png'
      }))
      .pipe(gulpIf('*.png', gulp.dest('app/images')))
      .pipe(gulpIf('*.scss', gulp.dest('app/scss')));
})

// gulp.task('images', function() {
//   return gulp.src('app/images/**/*.+(png|jpg|jpeg|gif|svg)')
//     .pipe(cache(imagemin({
//             progressive: true,
//             optimizationLevel: 5,
//             multipass: true,
//             SVGOPlugins: [
//               {'removeTitle': true },
//               {'removeUselessStrokeAndFill': false}
//             ]
//           }), {name: 'project'})) // use a project-specific cache
//     .pipe(gulp.dest('dist/images'));
// });

//
// Image optimization: minimization
//
var imagemin = require('gulp-imagemin');

gulp.task('images', function() {
  return gulp.src('app/images/**/*.+(png|jpg|jpeg|gif|svg)')
    .pipe(newer('dist/images'))
    .pipe(imagemin({
            progressive: true,
            optimizationLevel: 5,
            multipass: true,
            SVGOPlugins: [
              {'removeTitle': true },
              {'removeUselessStrokeAndFill': false}
            ]
          }))
    .pipe(gulp.dest('dist/images'));
});

//
// HTML templating
//
var data = require('gulp-data');
var nunjucksRender = require('gulp-nunjucks-render');

gulp.task('nunjucks', function() {
    return gulp.src('app/pages/**/*.+(html|nunjucks)')
      .pipe(customPlumber('Error running Nunjucks'))
      .pipe(data(function() {
          return JSON.parse(fs.readFileSync('./app/data.json'));
      }))
      .pipe(nunjucksRender({
          path: ['app/templates']
      }))
      .pipe(gulp.dest('app'))
      .pipe(browserSync.reload({
        stream: true
      }));
});

//
// Minifying, stripping, bundling...
//
var useref = require('gulp-useref');
var uglify = require('gulp-uglify');
var unCss = require('gulp-uncss');
var cssnano = require('gulp-cssnano');
var cached = require('gulp-cached');
var rev = require('gulp-rev');
var revReplace = require('gulp-rev-replace');

gulp.task('useref', function() {
    return gulp.src('app/*.html')
        .pipe(useref())
        .pipe(cached('useref'))
//        .pipe(debug())
        .pipe(gulpIf('*.js', uglify()))
        .pipe(gulpIf('*.css', unCss({
          html: ['app/*.html'],
          ignore: [
            '.susy-test',
            /.is-/,
            /.has-/
          ]
          })))
        .pipe(gulpIf('*.css', cssnano()))
        .pipe(gulpIf('*.js', rev()))
        .pipe(gulpIf('*.css', rev()))
        .pipe(revReplace())
        .pipe(gulp.dest('dist'));
});

//
// Continuous integration: testing
//
var Server = require('karma').Server;

gulp.task('test', function(done) {
    new Server({
        configFile: process.cwd() + '/karma.conf.js',
        singleRun: true
    }, done).start();
});

gulp.task('dev-ci', function(callback) {
    runSequence(
      'clean:dev',
      ['sprites', 'lint:js', 'lint:scss'],
      ['sass', 'nunjucks'],
      callback
    );
});

gulp.task('clean:dev', function() {
    return del.sync([
        'app/css',
        'app/*.html'
    ]);
});

gulp.task('cache:clear', function(callback) {
  return cache.clearAll(callback);
});

gulp.task('default', function(callback) {
    runSequence(
      'clean:dev',
      ['sprites', 'lint:js', 'lint:scss'],
      ['sass', 'nunjucks'],
      ['browserSync', 'watch'],
      callback
    );
});

//
// Copy webfont files to dist
//
gulp.task('fonts', function() {
  return gulp.src('app/fonts/**/*')
    .pipe(gulp.dest('dist/fonts'));
});

//
// Clean the dist folder
//
gulp.task('clean:dist', function(callback) {
  return del.sync([
    'dist/**/*',
    '!dist/images',
    '!dist/images/**/*'
  ]);
});

//
// Unified build task
//
gulp.task('build', function(callback) {
  runSequence(
    ['clean:dev', 'clean:dist'],
    ['sprites', 'lint:js', 'lint:scss'],
    ['sass', 'nunjucks'],
    ['useref', 'images', 'fonts', 'test'],
    callback
  );
});

gulp.task('browserSync:dist', function() {
  browserSync.init({
    server: {
      baseDir: 'dist'
    }
  });
});

gulp.task('watch', function() {
    gulp.watch('app/scss/**/*.scss', ['sass', 'lint:scss']);
    gulp.watch('app/js/**/*.js', ['lint:js']);
    gulp.watch('app/js/**/*.js', browserSync.reload);
    gulp.watch('app/*.html', browserSync.reload);
    gulp.watch([
        'app/templates/**/*',
        'app/pages/**/*.+(html|nunjucks)',
        'app/data.json'
    ], ['nunjucks']);
});
