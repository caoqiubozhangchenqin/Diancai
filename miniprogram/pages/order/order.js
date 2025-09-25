// pages/order/order.js

// 初始化云数据库
const db = wx.cloud.database();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    date: '', // 当前点菜的日期
    groupedDishes: [], // 按分类分组后的菜品列表，用于页面渲染
    selectedDishes: [], // 存储被选中菜品的 _id 列表
    selectedDishesMap: {}, // 辅助数据，用于快速判断某个菜品是否被选中，以控制UI样式
    bgImageUrl: '' // 背景图的临时链接
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 从页面跳转参数中获取日期，如果没有则使用当天日期
    const date = options.date || new Date().toISOString().split('T')[0];
    this.setData({
      date: date
    });

    // 页面加载时，立即执行获取菜品列表的函数
    this.fetchDishes();

    // 异步获取背景图的URL
    wx.cloud.getTempFileURL({
      fileList: ['cloud://cloud1-3gnbur5wc17b54e9.636c-cloud1-3gnbur5wc17b54e9-1380419241/backgrounds/diancai.png']
    }).then(res => {
      if (res.fileList.length > 0) {
        this.setData({
          bgImageUrl: res.fileList[0].tempFileURL
        });
      }
    }).catch(error => {
      console.error("获取点菜页背景图失败", error);
    });
  },

  /**
   * 核心函数：从云数据库获取并处理菜品数据
   */
  fetchDishes() {
    wx.showLoading({
      title: '加载菜单中...',
    });

    // 从 'dishes' 集合获取所有菜品文档
    db.collection('dishes').get()
      .then(res => {
        const dishes = res.data;
        if (dishes.length === 0) {
          wx.showToast({ title: '菜单为空', icon: 'none' });
          this.setData({ groupedDishes: [] });
          return;
        }

        // 1. 将菜品按 category 字段进行分组
        const grouped = {};
        dishes.forEach(dish => {
          const category = dish.category || '未分类'; // 如果菜品没有分类，则归为'未分类'
          if (!grouped[category]) {
            grouped[category] = [];
          }
          grouped[category].push(dish);
        });

        // 2. 将分组后的对象转换为 WXML 中 wx:for 需要的数组格式
        const groupedDishes = Object.keys(grouped).map(category => {
          return {
            category: category,
            dishes: grouped[category]
          };
        });

        // 3. 更新页面数据，WXML会自动渲染出菜品列表
        this.setData({
          groupedDishes: groupedDishes
        });
      })
      .catch(err => {
        console.error("获取菜品列表失败", err);
        wx.showToast({
          title: '加载菜单失败',
          icon: 'error'
        });
      })
      .finally(() => {
        // 无论成功还是失败，最后都隐藏加载提示
        wx.hideLoading();
      });
  },

  /**
   * 核心函数：处理用户点击菜品卡片的事件
   */
  onCardTap(e) {
    const dishId = e.currentTarget.dataset.dishid;
    const { selectedDishes, selectedDishesMap } = this.data;
    
    // 检查当前菜品是否已被选中
    if (selectedDishesMap[dishId]) {
      // 如果已选中，则取消选中
      delete selectedDishesMap[dishId]; // 从Map中移除
      const index = selectedDishes.indexOf(dishId);
      if (index > -1) {
        selectedDishes.splice(index, 1); // 从Array中移除
      }
    } else {
      // 如果未选中，则加入选中
      selectedDishesMap[dishId] = true; // 加入Map
      selectedDishes.push(dishId); // 加入Array
    }
    
    // 更新data，触发页面UI（如对勾图标）的变化
    this.setData({
      selectedDishes: selectedDishes,
      selectedDishesMap: selectedDishesMap
    });
  },

  /**
   * 核心函数：提交菜单
   */
  async submitMenu() {
    wx.showLoading({ title: '提交中...' });
    const { date, selectedDishes: newDishes } = this.data;
    let oldDishes = [];

    try {
      // 1. 先查询当天的旧菜单记录
      const res = await db.collection('daily_menus').where({ date: date }).get();
      
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
        const docId = res.data[0]._id;
        await db.collection('daily_menus').doc(docId).update({ data: { dishes: newDishes } });
      } else {
        await db.collection('daily_menus').add({ data: { date: date, dishes: newDishes } });
      }

      // 4. 调用云函数，进行差量更新
      this.handleSubmitSuccess(dishesToIncrement, dishesToDecrement);

    } catch (err) {
      this.handleSubmitFail(err);
    }
  },

  /**
   * 辅助函数：提交成功后的处理
   */
  handleSubmitSuccess(dishesToIncrement, dishesToDecrement) {
    wx.hideLoading();
    
    const toastTitle = this.data.selectedDishes.length > 0 ? '提交成功！' : '菜单已清空！';
    wx.showToast({ title: toastTitle });
    
    // 仅在有菜品数量变动时才调用云函数
    if (dishesToIncrement.length > 0 || dishesToDecrement.length > 0) {
      wx.cloud.callFunction({
        name: 'updateDishCount', // 注意：这里需要一个能处理差量更新的云函数
        data: {
          dishesToIncrement,
          dishesToDecrement
        }
      }).then(res => {
        console.log('差量更新点菜次数成功', res);
      }).catch(err => {
        console.error('差量更新点菜次数失败', err);
        // 这里可以给出一个非阻塞的错误提示
        wx.showToast({
          title: '同步点菜次数失败',
          icon: 'none'
        })
      });
    }

    // 1.5秒后自动返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  /**
   * 辅助函数：提交失败后的处理
   */
  handleSubmitFail(err) {
    wx.hideLoading();
    console.error('提交菜单失败', err);
    wx.showToast({
      title: '提交失败，请重试',
      icon: 'error'
    });
  }
})