const fs = require('fs');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

function envBool(name, defaultValue = false) {
  const v = process.env[name];
  if (v == null) return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(v).toLowerCase());
}

// 瓦片数据非常多（~8 万+文件），在 vue-cli build 时全量复制到 dist 会极慢。
// 约定：
// - SWE_TILES_MODE=copy   -> 由 webpack 在构建时复制 tiles 到 dist/tiles（最慢，但产物自包含）
// - SWE_TILES_MODE=symlink/none/未设置 -> 默认不在 webpack 阶段复制（推荐在 Makefile/脚本里做 symlink 或按需复制）
const tilesMode = String(process.env.SWE_TILES_MODE || '').toLowerCase();
const copyTiles = envBool('SWE_COPY_TILES', tilesMode === 'copy');
const copySkydata = envBool('SWE_COPY_SKYDATA', false);

function resolveTilesPath() {
  const candidates = [];

  if (process.env.TILES_SRC_DIR) {
    candidates.push(process.env.TILES_SRC_DIR);
  }

  candidates.push(
    path.resolve(__dirname, '../../tile-server/tiles'),
    path.resolve(__dirname, '../tile-server/tiles'),
    path.resolve(__dirname, 'tile-server/tiles')
  );

  return candidates.find(p => fs.existsSync(p));
}

module.exports = {
  runtimeCompiler: true,
  publicPath: process.env.CDN_ENV ? process.env.CDN_ENV : '/',
  productionSourceMap: true,
  css: {
    loaderOptions: {
      // 静音依赖（如 Vuetify）内部的 Dart Sass 弃用警告，避免刷屏。
      // 不会修改 node_modules，只影响构建时输出。
      sass: {
        sassOptions: {
          quietDeps: true,
          // Vuetify 2（以及不少旧依赖）会触发这些弃用提示；屏蔽它们以保持构建输出可读。
          // 参考：https://sass-lang.com/documentation/js-api/interfaces/options/#silencedeprecations
          silenceDeprecations: [
            'slash-div',
            'global-builtin',
            'if-function',
            'import',
            'legacy-js-api'
          ]
        }
      },
      scss: {
        sassOptions: {
          quietDeps: true,
          silenceDeprecations: [
            'slash-div',
            'global-builtin',
            'if-function',
            'import',
            'legacy-js-api'
          ]
        }
      }
    }
  },

  devServer: {
    https: false,  // 禁用HTTPS
    port: 8080
  },

  chainWebpack: config => {
    // workaround taken from webpack/webpack#6642
    config.output
      .globalObject('this')
    // Tell that our main wasm file needs to be loaded by file loader
    config.module
      .rule('mainwasm')
      .test(/stellarium-web-engine\.wasm$/)
      .type('javascript/auto')
      .use('file-loader')
        .loader('file-loader')
        .options({name: '[name].[hash:8].[ext]', outputPath: 'js'})
        .end()
  },

  pluginOptions: {
    i18n: {
      locale: 'en',
      fallbackLocale: 'en',
      localeDir: 'locales',
      enableInSFC: true
    }
  },

  configureWebpack: {
    optimization: {
      minimize: false
    },
    devtool: 'source-map',
    plugins: (() => {
      const patterns = [];
      if (copyTiles) {
        const tilesPath = resolveTilesPath();
        if (!tilesPath) {
          throw new Error(
            'Tiles directory not found. Set TILES_SRC_DIR or provide tiles in ../../tile-server/tiles, ../tile-server/tiles, or ./tile-server/tiles.'
          );
        }
        patterns.push({
          from: tilesPath,
          to: 'tiles',
          ignore: ['**/.DS_Store', '**/Thumbs.db']
        });
      }
      if (copySkydata) {
        patterns.push({
          from: path.resolve(__dirname, '../test-skydata'),
          to: 'skydata',
          ignore: ['**/.DS_Store']
        });
      }

      if (!patterns.length) return [];
      return [
        new CopyWebpackPlugin(patterns, {
          // copyUnmodified=true 会显著拖慢构建；这里保持默认行为（只在需要时复制）。
          // 注意：vue-cli build 默认会清空 dist，所以如果每次都要产物自包含 tiles，就用 SWE_TILES_MODE=copy。
          copyUnmodified: false
        })
      ];
    })()
  }
}
