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
    config.plugin('copy')
    .tap(([pathConfigs]) => {
      if (!pathConfigs || !pathConfigs[0]) {
        // handle error or return early
        return [pathConfigs];
      }
    
      const to = pathConfigs[0] && pathConfigs[0].to; // 使用传统的条件检查
      if (to) {
        pathConfigs[0].force = true; // so the original `/public` folder keeps priority
        // add other locations.
        pathConfigs.unshift({
          from: '../skydata',
          to: to + '/skydata',
        });
      }
    
      return [pathConfigs];
    })
    
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
    devtool: 'source-map'
  }
}
