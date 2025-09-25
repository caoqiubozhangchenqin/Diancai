// pages/stats/stats.js
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    selectedMonth: '',
    rankedDishes: [],
    loading: true,
    bgImageUrl: '' // 新增：用于存放背景图的云存储链接
  },

  onLoad(options) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const defaultMonth = `${year}-${month}`;
    
    this.setData({ selectedMonth: defaultMonth });
    this.queryStats(defaultMonth);

    // 新增：从云存储获取背景图链接
    wx.cloud.getTempFileURL({
      // 使用你提供的 delicious.png 的 File ID
      fileList: ['cloud://cloud1-3gnbur5wc17b54e9.636c-cloud1-3gnbur5wc17b54e9-1380419241/backgrounds/delicious.png']
    }).then(res => {
      if (res.fileList.length > 0) {
        this.setData({
          bgImageUrl: res.fileList[0].tempFileURL
        });
      }
    }).catch(error => {
      console.error("获取统计页背景图失败", error);
    });
  },

  onMonthChange(e) {
    const selectedMonth = e.detail.value;
    this.setData({ selectedMonth: selectedMonth, rankedDishes: [], loading: true });
    this.queryStats(selectedMonth);
  },

  async queryStats(monthStr) { // 'YYYY-MM'
    // ... 这部分代码和原来一样，无需修改 ...
    try {
      const menuRes = await db.collection('daily_menus').where({
        date: db.RegExp({ regexp: '^' + monthStr })
      }).get();

      if (menuRes.data.length === 0) {
        this.setData({ rankedDishes: [], loading: false });
        return;
      }

      const allDishIdsInMonth = menuRes.data.flatMap(item => item.dishes);
      const dishCounts = allDishIdsInMonth.reduce((acc, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});

      const uniqueDishIds = Object.keys(dishCounts);
      if (uniqueDishIds.length === 0) {
        this.setData({ rankedDishes: [], loading: false });
        return;
      }

      const dishesRes = await db.collection('dishes').where({
        _id: _.in(uniqueDishIds)
      }).get();
      
      let rankedDishes = dishesRes.data.map(dish => ({
        ...dish,
        count: dishCounts[dish._id]
      }));

      rankedDishes.sort((a, b) => b.count - a.count);

      this.setData({ rankedDishes: rankedDishes, loading: false });

    } catch (error) {
      console.error("统计查询失败", error);
      this.setData({ loading: false });
      wx.showToast({ title: '查询失败', icon: 'none' });
    }
  }
});