// pages/index/index.js
const app = getApp();
let db, _; // 将db和command声明在页面作用域

Page({
  data: {
    todayDateString: '',
    selectedDateString: '',
    todayMenuDishes: [],
    selectedMenuDishes: [],
    markedDaysInMonth: [],
    orderButtonText: '去点菜',
    bgImageUrl: '',
    isPlaying: false,
    musicIconUrl: ''
  },

  onLoad(options) {
    // 等待全局 cloud 初始化完成
    app.globalData.cloudPromise && app.globalData.cloudPromise.then(() => {
      // 将全局的 icon url 注入页面
      this.setData({ musicIconUrl: app.globalData.musicIconUrl || '', bgImageUrl: app.globalData.bgImageUrl || '' });
      // 如果 global bgm 存在，设置页面播放状态
      const bgm = app.globalData.bgm;
      if (bgm) {
        this.setData({ isPlaying: !!bgm.src && !bgm.paused });
        // 绑定事件以同步状态
        bgm.onPlay && bgm.onPlay(() => this.setData({ isPlaying: true }));
        bgm.onPause && bgm.onPause(() => this.setData({ isPlaying: false }));
        bgm.onStop && bgm.onStop(() => this.setData({ isPlaying: false }));
        bgm.onEnded && bgm.onEnded(() => this.setData({ isPlaying: false }));
      }
      // 初始化 db 引用
      try { db = app.globalData.cloud.database(); _ = db.command; } catch(e){}
      this.refreshPageData();
    }).catch(err => {
      // 如果 cloud 初始化失败，也尝试加载页面数据（db 为空时函数会短路）
      this.refreshPageData();
    });
  },

  onShow() {
    // 同步状态
    const bgm = app.globalData.bgm;
    if (bgm) this.setData({ isPlaying: !!bgm.src && !bgm.paused });
  },

  refreshPageData() {
    if (!db) return; // 安全校验
    wx.showLoading({ title: '刷新中...' });
    const today = new Date();
    const formatDate = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const todayStr = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const currentSelectedDate = this.data.selectedDateString || todayStr;
    this.setData({ todayDateString: todayStr, selectedDateString: currentSelectedDate });
    const [year, month] = currentSelectedDate.split('-').map(Number);

    Promise.all([
      this.getMenuByDate(this.data.todayDateString),
      this.getMenuByDate(this.data.selectedDateString),
      this.getMarkedDaysByMonth(year, month)
    ]).then(([todayMenu, selectedMenu, markedDays]) => {
      const buttonText = selectedMenu.length > 0 ? '修改菜单' : '去点菜';
      this.setData({
        todayMenuDishes: todayMenu,
        selectedMenuDishes: selectedMenu,
        markedDaysInMonth: markedDays,
        orderButtonText: buttonText
      });
      wx.hideLoading();
    }).catch(err => {
      console.error('页面刷新失败', err);
      wx.hideLoading();
      wx.showToast({ title: '数据刷新失败', icon: 'none' });
    });
  },

  getMenuByDate(dateStr) {
    if (!db) return Promise.resolve([]);
    return db.collection('diancai_daily_menus').where({ date: dateStr }).get()
      .then(res => {
        if (res.data.length > 0 && res.data[0].dishes.length > 0) {
          const dishIds = res.data[0].dishes;
          return db.collection('diancai_dishes').where({ _id: _.in(dishIds) }).get()
            .then(dishesRes => dishesRes.data);
        }
        return [];
      });
  },

  getMarkedDaysByMonth(year, month) {
    if (!db) return Promise.resolve([]);
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return db.collection('diancai_daily_menus').where({
      date: db.RegExp({ regexp: '^' + monthStr })
    }).get().then(res => {
      return res.data.filter(item => item.dishes && item.dishes.length > 0)
        .map(item => parseInt(item.date.split('-')[2]));
    });
  },

  onDaySelect(e) {
    if (!db) return;
    const { year, month, day } = e.detail;
    const formatDate = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const selectedDateStr = formatDate(year, month, day);
    if (selectedDateStr === this.data.selectedDateString) return;
    wx.showLoading({ title: '查询中...' });
    this.getMenuByDate(selectedDateStr).then(res => {
      this.setData({
        selectedDateString: selectedDateStr,
        selectedMenuDishes: res,
        orderButtonText: res.length > 0 ? '修改菜单' : '去点菜'
      });
      wx.hideLoading();
    });
  },

  onMonthChange(e) {
    if (!db) return;
    const { year, month } = e.detail;
    this.getMarkedDaysByMonth(year, month).then(res => this.setData({ markedDaysInMonth: res }));
  },

  goToOrderPage() {
    wx.navigateTo({ url: `/pages/order/order?date=${this.data.selectedDateString}` });
  },

  goToStatsPage() {
    wx.navigateTo({ url: '/pages/stats/stats' });
  },

  // 切换音乐播放/暂停
  toggleMusic() {
    const bgm = app.globalData && app.globalData.bgm;
    if (!bgm) {
      wx.showToast({ title: '音频不可用', icon: 'none' });
      return;
    }
    if (bgm.paused) {
      bgm.play();
      this.setData({ isPlaying: true });
    } else {
      bgm.pause();
      this.setData({ isPlaying: false });
    }
  },

  onUnload() {
    // 移除页面对 bgm 的绑定（没有具体 off API，使用空函数覆盖回调）
    const bgm = app.globalData && app.globalData.bgm;
    if (bgm) {
      try {
        bgm.onPlay && bgm.onPlay(() => {});
        bgm.onPause && bgm.onPause(() => {});
        bgm.onStop && bgm.onStop(() => {});
        bgm.onEnded && bgm.onEnded(() => {});
      } catch (e) {}
    }
  }
})