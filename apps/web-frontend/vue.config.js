const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = {
  runtimeCompiler: true,
  publicPath: process.env.CDN_ENV ? process.env.CDN_ENV : '/',
  productionSourceMap: true,

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
    plugins: [
      new CopyWebpackPlugin([
        // 复制瓦片数据
        {
          from: path.resolve(__dirname, '../../tile-server/tiles'),
          to: 'tiles',
          ignore: ['**/.DS_Store', '**/Thumbs.db']
        },
        // 复制skydata（如果存在）
        {
          from: path.resolve(__dirname, '../test-skydata'),
          to: 'skydata',
          ignore: ['**/.DS_Store']
        }
      ], {
        copyUnmodified: true
      })
    ]
  }
}
