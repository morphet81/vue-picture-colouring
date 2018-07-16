module.exports = {
    // configureWebpack: (conf) => {
    //   conf.entry['app'].push(require.resolve(`webpack-dev-server/client`) + '?http://192.168.1.100:80')
    // },
    devServer: {
    //   host: '0.0.0.0',
    //   port: 1288,
      disableHostCheck: true
    }
  }