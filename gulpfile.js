var browserSync = require('browser-sync').create()
var reload = browserSync.reload
var gulp = require('gulp')
// var sass = require('gulp-sass')

gulp.task('css:dev', function () {
  return gulp.src('www/styles/*.css')
  .pipe(reload({stream: true}))
})

gulp.task('js:dev', function () {
  return gulp.src('www/js/*.js')
  .pipe(reload({stream: true}))
})
gulp.task('tpl:dev', function () {
  return gulp.src('www/*.html')
  .pipe(reload({stream: true}))
})

gulp.task('dev', ['js:dev', 'css:dev', 'tpl:dev'], function () {
  browserSync.init({
    // server: {
    //   baseDir: "./dist"
    // },
    proxy: "localhost:8080",
    notify: false
  })
  gulp.watch('www/js/*.js', ['js:dev'])
  gulp.watch('www/styles/*.css', ['css:dev'])
  gulp.watch('www/*.html', ['tpl:dev'])
})