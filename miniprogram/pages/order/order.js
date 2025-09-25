// pages/order/order.js
const db = wx.cloud.database();

Page({
  data: {
    // ... (data 部分无变化) ...
    date: '',
    groupedDishes: [],
    selectedDishes: [],
    selectedDishesMap: {},
    bgImageUrl: ''
  },

  onLoad(options) {
    // ... (onLoad 部分无变化) ...
    const date = options.date || new Date().toISOString().split('T')[0];
    this.setData({ date });
    this.fetchDishes();
    wx.cloud.getTempFileURL({
      fileList: ['cloud://cloud1-3gnbur5wc17b54e9.636c-cloud1-3gnbur5wc17b54e9-1380419241/backgrounds/diancai.png']
    }).then(res => {
      if (res.fileList.length > 0) {
        this.setData({ bgImageUrl: res.fileList[0].tempFileURL });
      }
    }).catch(error => { console.error("获取点菜页背景图失败", error); });
  },

  fetchDishes() { /* ... (无变化) ... */ },
  onCardTap(e) { /* ... (无变化) ... */ },

  // --- 核心升级：submitMenu 函数 ---
  async submitMenu() {
    wx.showLoading({ title: '提交中...' });
    const { date, selectedDishes: newDishes } = this.data;
    let oldDishes = [];

    try {
      // 1. 先查询当天的旧菜单记录
      const res = await db.collection('daily_menus').where({ date: date }).get();
      
      // 如果存在旧菜单，则记录下来
      if (res.data.length > 0) {
        oldDishes = res.data[0].dishes || [];
      }

      // 2. 计算差量：找出新增和移除的菜品
      const newDishesSet = new Set(newDishes);
      const oldDishesSet = new Set(oldDishes);
      
      const dishesToIncrement = newDishes.filter(id => !oldDishesSet.has(id));
      const dishesToDecrement = oldDishes.filter(id => !newDishesSet.has(id));

      // 3. 更新或新增 daily_menus 集合
      if (res.data.length > 0) {
        // 更新
        const docId = res.data[0]._id;
        await db.collection('daily_menus').doc(docId).update({ data: { dishes: newDishes } });
      } else {
        // 新增
        await db.collection('daily_menus').add({ data: { date: date, dishes: newDishes } });
      }

      // 4. 调用新的云函数，进行差量更新
      this.handleSubmitSuccess(dishesToIncrement, dishesToDecrement);

    } catch (err) {
      this.handleSubmitFail(err);
    }
  },

  // --- 核心升级：handleSubmitSuccess 函数 ---
  handleSubmitSuccess(dishesToIncrement, dishesToDecrement) {
    wx.hideLoading();
    
    const toastTitle = this.data.selectedDishes.length > 0 ? '提交成功！' : '菜单已清空！';
    wx.showToast({ title: toastTitle });
    
    // 仅在有需要更新的菜品时才调用云函数
    if (dishesToIncrement.length > 0 || dishesToDecrement.length > 0) {
      wx.cloud.callFunction({
        name: 'updateDishCounts', // 调用新版的云函数
        data: {
          dishesToIncrement,
          dishesToDecrement
        }
      }).then(res => {
        console.log('差量更新点菜次数成功', res);
      }).catch(err => {
        console.error('差量更新点菜次数失败', err);
      });
    }

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  handleSubmitFail(err) { /* ... (无变化) ... */ },
})