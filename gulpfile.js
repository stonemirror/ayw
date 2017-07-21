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
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var scssLint = require('gulp-scss-lint');
var Server = require('karma').Server;

function customPlumber(errTitle) {
    return plumber({
      errorHandler: notify.onError({
        title: errTitle || "Error running Gulp",
        message: "Error: <%= error.message %>",
        sound: "Glass"
      })
    });
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
