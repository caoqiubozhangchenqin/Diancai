// pages/index/index.js
const db = wx.cloud.database();
const _ = db.command;

const formatDate = (year, month, day) => {
  const y = year;
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

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
    wx.cloud.getTempFileURL({
      fileList: ['cloud://cloud1-3gnbur5wc17b54e9.636c-cloud1-3gnbur5wc17b54e9-1380419241/backgrounds/bg.png'] 
    }).then(res => {
      if (res.fileList.length > 0) {
        this.setData({
          bgImageUrl: res.fileList[0].tempFileURL
        });
      }
    }).catch(error => {
      console.error("获取背景图失败", error);
    });
  },

  onShow() {
    this.refreshPageData();
  },

  refreshPageData() {
    wx.showLoading({ title: '刷新中...' });

    const today = new Date();
    const todayStr = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const currentSelectedDate = this.data.selectedDateString || todayStr;

    this.setData({
      todayDateString: todayStr,
      selectedDateString: currentSelectedDate
    });

    const dateParts = currentSelectedDate.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]);

    const promise1 = this.getMenuByDate(this.data.todayDateString);
    const promise2 = this.getMenuByDate(this.data.selectedDateString);
    const promise3 = this.getMarkedDaysByMonth(year, month);

    Promise.all([promise1, promise2, promise3])
      .then(([todayMenu, selectedMenu, markedDays]) => {
        const buttonText = selectedMenu.length > 0 ? '修改菜单' : '去点菜';
        this.setData({
          todayMenuDishes: todayMenu,
          selectedMenuDishes: selectedMenu,
          markedDaysInMonth: markedDays,
          orderButtonText: buttonText
        });
        wx.hideLoading();
      })
      .catch(err => {
        console.error("页面刷新失败", err);
        wx.hideLoading();
        wx.showToast({ title: '数据刷新失败', icon: 'none' });
      });
  },

  getMenuByDate(dateStr) {
    return new Promise((resolve, reject) => {
      db.collection('daily_menus').where({ date: dateStr }).get()
        .then(res => {
          if (res.data.length > 0 && res.data[0].dishes.length > 0) {
            const dishIds = res.data[0].dishes;
            db.collection('dishes').where({ _id: _.in(dishIds) }).get()
              .then(dishesRes => resolve(dishesRes.data))
              .catch(err => reject(err));
          } else {
            resolve([]);
          }
        })
        .catch(err => reject(err));
    });
  },

  // --- 核心修改在这里 ---
  getMarkedDaysByMonth(year, month) {
    return new Promise((resolve, reject) => {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      db.collection('daily_menus').where({
        date: db.RegExp({ regexp: '^' + monthStr })
      }).get()
        .then(res => {
          // 之前的逻辑: const markedDays = res.data.map(...)
          
          // 现在的逻辑：先用 filter 筛选，再用 map 转换
          const markedDays = res.data
            .filter(item => item.dishes && item.dishes.length > 0) // 只保留 dishes 数组不为空的记录
            .map(item => parseInt(item.date.split('-')[2])); // 然后才提取日期
            
          resolve(markedDays);
        })
        .catch(err => reject(err));
    });
  },

  onDaySelect(e) {
    const { year, month, day } = e.detail;
    const selectedDateStr = formatDate(year, month, day);
    
    if (selectedDateStr === this.data.selectedDateString) {
      return;
    }

    wx.showLoading({ title: '查询中...' });
    this.getMenuByDate(selectedDateStr).then(res => {
      const buttonText = res.length > 0 ? '修改菜单' : '去点菜';
      
      this.setData({
        selectedDateString: selectedDateStr,
        selectedMenuDishes: res,
        orderButtonText: buttonText
      });
      wx.hideLoading();
    });
  },

  onMonthChange(e) {
    const { year, month } = e.detail;
    this.getMarkedDaysByMonth(year, month).then(res => {
      this.setData({ markedDaysInMonth: res });
    });
  },

  goToOrderPage() {
    wx.navigateTo({
      url: `/pages/order/order?date=${this.data.selectedDateString}`
    });
  },
  goToStatsPage() {
    wx.navigateTo({
      url: '/pages/stats/stats',
    });
  }
})