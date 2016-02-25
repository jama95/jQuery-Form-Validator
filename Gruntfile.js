//TODO: During next major version bump change to /dist. Leaving at ./form-validator for backwards
//compatibility
const DIST_DIR = './form-validator';
const MAIN_PLUGIN_FILE = './form-validator/jquery.form-validator.js';
const SRC_DIR = './src';
const MAIN_DIR = '/main/';
const MODULE_DIR = '/modules/';
const LANG_DIR = '/lang/';
const CSS_FILE = 'theme-default.css';

var fs = require('fs'),
  readFile = function (file) {
    return fs.readFileSync(file, 'utf-8');
  },
  replaceInFile = function (path, from, to) {
    fs.writeFileSync(path, readFile(path).replace(from, to));
  };

function initializeGruntConfig(grunt, filesToBuild) {
  grunt.initConfig({

    // Import package manifest
    pkg: grunt.file.readJSON("package.json"),

    // Banner definitions
    meta: {
      banner: "/** File generated by Grunt -- do not modify\n" +
      " *  <%= (pkg.title || pkg.name).toUpperCase() %>\n" +
      " *\n" +
      " *  @version <%= pkg.version %>\n" +
      " *  @website <%= pkg.homepage %>\n" +
      " *  @author <%= pkg.author.name %>, <%= pkg.author.url %>\n" +
      " *  @license <%= pkg.license %>\n" +
      " */\n"
    },

    // Concat definitions.
    concat: filesToBuild.concat,

    cssmin: {
      target: {
        files: filesToBuild.cssFiles
      }
    },
    // Lint definitions
    jshint: {
      files: [SRC_DIR + '/*'],
      options: {
        jshintrc: ".jshintrc",
        ignores: [SRC_DIR + '/' + CSS_FILE]
      }
    },

    // Minify definitions
    uglify: filesToBuild.uglify,

    // watch for changes to source
    // Better than calling grunt a million times
    // (call 'grunt watch')
    watch: {
      files: [SRC_DIR + '/**'],
      tasks: ['test'],
      options: { nospawn: true}
    },

    // Unit tests
    qunit: {
      all: ['test/qunit.html']
    },

    // Standalone servers
    connect: {
      server: {
        options: {
          port: 8000,
          base: '.',
          keepalive: true
        }
      }
    },

    clean: [DIST_DIR + '/']
  });
}

module.exports = function (grunt) {
  var filesToBuild =  {
      uglify: {},
      concat: {
        main:{
          src: [SRC_DIR + MAIN_DIR+'core-validators.js'],
          dest: MAIN_PLUGIN_FILE
        }
      }
  };
  // Gather up all module and language files
  [MODULE_DIR, LANG_DIR].forEach(function (path) {
    var srcPath = SRC_DIR + path;
    var distPath = DIST_DIR + path;
    if (path === MODULE_DIR) {
      distPath = DIST_DIR + '/';
    }

    fs.readdirSync(srcPath).forEach(function (fileName) {
        var fullPath = srcPath + fileName;
        filesToBuild.uglify[distPath + fileName] = fullPath;
        filesToBuild.concat[fullPath] = {
          src: [fullPath],
          dest: distPath + fileName
        };
    });
  });
  filesToBuild.concat[CSS_FILE] = {
    src: [SRC_DIR + '/' + CSS_FILE],
    dest: DIST_DIR + '/' + CSS_FILE
  };
  // Gather up all source files that will added to minified core library
  fs.readdirSync(SRC_DIR + MAIN_DIR).forEach(function (fileName) {
    var fullPath = SRC_DIR + MAIN_DIR + fileName;
    if (filesToBuild.concat.main.src.indexOf(fullPath) === -1) {
      filesToBuild.concat.main.src.unshift(fullPath);
    }
  });

  filesToBuild.cssFiles = [];
  filesToBuild.cssFiles.push({
    dest: DIST_DIR,
    src: CSS_FILE,
    cwd: SRC_DIR,
    expand: true,
    ext: '.min.css'
  });

  // Add options for concat and uglify
  filesToBuild.concat.options = {
    banner: "<%= meta.banner %>"
  };
  filesToBuild.uglify.options = {
    banner: "<%= meta.banner %>"
  };

  // Add main script to uglify
  filesToBuild.uglify[MAIN_PLUGIN_FILE] = {
    src: MAIN_PLUGIN_FILE,
    expand: true,
    extDot: 'last',
    ext: '.min.js'
  };

  initializeGruntConfig(grunt, filesToBuild);
  /*
   * Change to new version or the next version number. The project must be built again after this task
   * in order for the version change to take effect.
   */
  grunt.registerTask('version', 'Bump up the version number, or change version name by adding --new-version=3.1.0', function () {
    var pkg = grunt.config.get('pkg'),
      currentVersion = pkg.version,
      newVersion = grunt.option('new-version');

    if (!newVersion) {
      var versionParts = currentVersion.split('.'),
        newSubVersion = parseInt(versionParts.splice(versionParts.length - 1, 1)[0]) + 1;
      newSubVersion = newSubVersion < 10 && newSubVersion > 0 ? '0' + newSubVersion : newSubVersion.toString();
      newVersion = versionParts.join('.') + '.' + newSubVersion;
    }

    grunt.log.writeln('* Moving from version ' + currentVersion + ' to ' + newVersion);

    replaceInFile('package.json', '"version": "' + currentVersion + '"',
      '"version": "' + newVersion + '"');
    replaceInFile('formvalidator.jquery.json', '"version": "' + currentVersion + '"', '"version": "' + newVersion + '"');

    // Set new version globally (can later on be used by concat/uglify)
    pkg.version = newVersion;
    grunt.config.set('pkg', pkg);
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.registerTask("build-production", ["version", "cssmin", "test", "uglify"]);
  grunt.registerTask('test', ['concat', 'cssmin','jshint', 'qunit']);
  grunt.registerTask("default", ["test", "watch"]);
};
