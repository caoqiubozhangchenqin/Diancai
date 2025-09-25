// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })

    // 初始化云开发环境
    wx.cloud.init({
      // 你的云环境ID，请替换成你自己的
      env: 'cloud1-3gnbur5wc17b54e9',
      traceUser: true,
    })
  }
})