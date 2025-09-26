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

    // 【核心改造】创建并初始化一个指向共享环境的独立云实例
    const cloud = new wx.cloud.Cloud({
      resourceAppid: 'wxb0112230d1040cf5', // 资源方小程序A的AppID
      resourceEnv: 'cloud1-3ge5gomsffe800a7', // 资源方小程序A的环境ID
    });

    // 初始化这个实例，并将Promise保存在globalData中
    this.globalData.cloudPromise = cloud.init().then(() => {
      console.log('共享云环境实例初始化成功');
      // 将初始化好的实例也存入globalData，方便各页面直接使用
      this.globalData.cloud = cloud;
      return cloud; // 将实例传递下去
    }).catch(err => {
      console.error('共享云环境实例初始化失败', err);
      wx.showModal({
        title: '网络错误',
        content: '云服务连接失败，请检查网络后重启小程序',
        showCancel: false
      });
      // 抛出错误，让页面的catch也能捕获到
      throw err; 
    });
  },

  globalData: {
    cloud: null, // 用于存放初始化好的云实例
    cloudPromise: null // 用于确保实例已完成初始化
  }
})