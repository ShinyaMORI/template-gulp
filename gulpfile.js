const {watch, task, src, dest, series} = require('gulp'),
sass = require('gulp-sass'),
cleanCss = require('gulp-clean-css'),
postcss = require('gulp-postcss'),
sassGlob = require("gulp-sass-glob"),
browserSync = require("browser-sync"),
autoprefixer = require("autoprefixer"),
uglify = require('gulp-uglify'),
browserify = require('browserify'),
babelify = require('babelify'),
replace = require('gulp-replace'),
through2 = require('through2'),
rev = require('gulp-rev'),
rename = require('gulp-rename'),
revRewrite = require('gulp-rev-rewrite'),
pug = require("gulp-pug");

const pugOptions = {
  pretty: true,
};

const browserSyncOption = {
  port: 8080,
  server: {
    baseDir: './dist/',
    index: 'index.html'
  },
  reloadOnRestart: true
};

function styles() {
  return src("./src/scss/**/*.scss")
  .pipe(sassGlob())
  .pipe(sass().on('error', sass.logError))
  .pipe(cleanCss())
  .pipe(postcss([
    autoprefixer({
      browsers: ["last 2 versions", "ie >= 9", "Android >= 4"],
      cascade: false
    })
  ]))
  .pipe(dest('./dist/css'));
}

function scripts() {
  return src("./src/js/*.js")
    .pipe(through2.obj(function (file, _, next) {
      browserify(file.path)
        .transform(babelify)
        .bundle(function (err, res) {
          if (!err) {
            file.contents = res;
            next(null, file);
          } else {
            next(err);
          }
        });
    }))
    .pipe(replace('[ENV_API_DOMAIN]', process.env['API_DOMAIN'] || ''))
    .pipe(replace('[ENV_API_TOKEN]', process.env['API_TOKEN'] || ''))
    .pipe(uglify())
    .pipe(dest('./dist/js'));
}

function htmls() {
  const manifest = src(['./dist/css/*.*', './dist/js/*.*', './dist/img/*.*'], { base: './dist' })
    .pipe(rev())
    .pipe(rename(function (path, file) {
      const revOrigFilename = file.revOrigPath.split('/').slice(-1)[0]
      const revOrigBasename = revOrigFilename.replace(path.extname, '')
      path.basename = revOrigBasename
      path.extname += '?' + file.revHash
    }))
    .pipe(rev.manifest())

  return src(['./src/pug/**/*.pug'])
    .pipe(pug(pugOptions))
    .pipe(revRewrite({ manifest }))
    .pipe(dest('./dist'))
}

function sync(done) {
  browserSync.init(browserSyncOption);
  done();
}

function watchFiles(done) {
  const browserReload = () => {
    browserSync.reload();
    done();
  };
  watch('./src/scss/**/*.scss').on('change', series(styles, browserReload));
  watch('./src/js/**/*.js').on('change', series(scripts, browserReload));
  watch('./src/**/*.pug').on('change', series(htmls, browserReload));
}

task('default', series(styles, scripts, htmls, sync, watchFiles));
task('build', series(styles, scripts, htmls))
