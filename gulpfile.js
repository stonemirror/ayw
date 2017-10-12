var gulp = require('gulp');
var sass = require('gulp-sass');
var plumber = require('gulp-plumber');
var notify = require('gulp-notify');
var browserSync = require('browser-sync');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');
var spritesmith = require('gulp.spritesmith');
var gulpIf = require('gulp-if');
var nunjucksRender = require('gulp-nunjucks-render');
var data = require('gulp-data');
var fs = require('fs');
var del = require('del');
var runSequence = require('run-sequence');
//
// Javascript
//
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
//
// SCSS
//
var scssLint = require('gulp-scss-lint');
var Server = require('karma').Server;
var gutil = require('gulp-util');
var useref = require('gulp-useref');
var uglify = require('gulp-uglify');
var debug = require('gulp-debug');
var cached = require('gulp-cached');
var unCss = require('gulp-uncss');
var cssnano = require('gulp-cssnano');
var imagemin = require('gulp-imagemin');
var cache = require('gulp-cache');
var newer = require('gulp-newer');

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

gulp.task('browserSync', function() {
    browserSync({
        server: {
            baseDir: 'app'
        },
    })
});

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

gulp.task('useref', function() {
    return gulp.src('app/*.html')
        .pipe(useref())
        .pipe(cached('useref'))
        .pipe(debug())
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
        .pipe(gulp.dest('dist'));
});

gulp.task('test', function(done) {
    new Server({
        configFile: process.cwd() + '/karma.conf.js',
        singleRun: true
    }, done).start();
});

gulp.task('clean:dev', function() {
    return del.sync([
        'app/css',
        'app/*.html'
    ]);
});

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

gulp.task('lint:scss', function() {
    return gulp.src('app/scss/**/*.scss')
        .pipe(scssLint({
            config: '.scss-lint.yml'
        }));
})

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

gulp.task('dev-ci', function(callback) {
    runSequence(
      'clean:dev',
      ['sprites', 'lint:js', 'lint:scss'],
      ['sass', 'nunjucks'],
      callback
    );
});

eslint = require('gulp-eslint');

gulp.task('eslint', function() {
  return gulp.src('app/js/**/*.js')
    .pipe(customPlumber('ESLint error!'))
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .pipe(gulp.dest('app/js'))
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
