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
    bgImageUrl: ''
  },

  onLoad(options) {
    // 【核心改造】等待app.js中的Promise完成后再执行后续操作
    app.globalData.cloudPromise.then(cloud => {
      // 从初始化好的全局实例中获取数据库引用和command
      db = cloud.database();
      _ = db.command;
      
      // 获取背景图
      cloud.getTempFileURL({
        fileList: ['cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/diancai/background/bg.png'] 
      }).then(res => {
        if (res.fileList.length > 0) this.setData({ bgImageUrl: res.fileList[0].tempFileURL });
      }).catch(error => console.error("获取背景图失败", error));

      // 页面加载时刷新数据
      this.refreshPageData();
      
    }).catch(err => {
      console.error('首页加载共享云环境失败', err);
      wx.showModal({ title: '错误', content: '加载云服务失败，请重启小程序' });
    });
  },

  onShow() {
    // onShow时也需要确保db已初始化
    if (db) {
      this.refreshPageData();
    }
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
      console.error("页面刷新失败", err);
      wx.hideLoading();
      wx.showToast({ title: '数据刷新失败', icon: 'none' });
    });
  },

  getMenuByDate(dateStr) {
    if (!db) return Promise.resolve([]); // 【新增】安全校验
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
    if (!db) return Promise.resolve([]); // 【新增】安全校验
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return db.collection('diancai_daily_menus').where({
      date: db.RegExp({ regexp: '^' + monthStr })
    }).get().then(res => {
      return res.data
        .filter(item => item.dishes && item.dishes.length > 0)
        .map(item => parseInt(item.date.split('-')[2]));
    });
  },

  onDaySelect(e) {
    if (!db) return; // 【新增】安全校验
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
    if (!db) return; // 【新增】安全校验
    const { year, month } = e.detail;
    this.getMarkedDaysByMonth(year, month).then(res => {
      this.setData({ markedDaysInMonth: res });
    });
  },

  goToOrderPage() {
    wx.navigateTo({ url: `/pages/order/order?date=${this.data.selectedDateString}` });
  },
  goToStatsPage() {
    wx.navigateTo({ url: '/pages/stats/stats' });
  }
})