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

      // 你的云文件 ID（确保与提供的一致）
      const mp3FileID = 'cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/今天啥个菜呀.mp3';
      const iconFileID = 'cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/diancai/background/diancai音乐.png';
      const bgFileID = 'cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/diancai/background/bg.png';
      const diancaiFileID = 'cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/diancai/background/diancai.png';

      // 获取临时可访问链接并初始化全局资源
      return cloud.getTempFileURL({ fileList: [mp3FileID, iconFileID, bgFileID, diancaiFileID] }).then(res => {
        const fileList = res.fileList || [];
        const mp3Url = (fileList[0] && fileList[0].tempFileURL) || '';
        const iconUrl = (fileList[1] && fileList[1].tempFileURL) || '';
        const bgUrl = (fileList[2] && fileList[2].tempFileURL) || '';
        const diancaiUrl = (fileList[3] && fileList[3].tempFileURL) || '';

        this.globalData.musicUrl = mp3Url;
        this.globalData.musicIconUrl = iconUrl;
        this.globalData.bgImageUrl = bgUrl;
        this.globalData.diancaiImageUrl = diancaiUrl;

        try {
          const bgm = wx.getBackgroundAudioManager();
          bgm.title = '今天啥个菜呀';
          bgm.epname = 'Diancai';
          bgm.coverImgUrl = iconUrl || '';

          if (mp3Url) {
            // 设置 src 会尝试自动播放（若被平台策略允许）
            bgm.src = mp3Url;
          }

          bgm.onError && bgm.onError(err => console.error('bgm error', err));
          this.globalData.bgm = bgm;
        } catch (e) {
          console.warn('无法初始化背景音频管理器', e);
          this.globalData.bgm = null;
        }

        return cloud;
      });
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