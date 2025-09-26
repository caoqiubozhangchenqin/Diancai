// pages/stats/stats.js
const app = getApp();
let db, _;

Page({
  data: {
    selectedMonth: '',
    rankedDishes: [],
    loading: true,
    bgImageUrl: ''
  },

  onLoad(options) {
    const today = new Date();
    const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    this.setData({ selectedMonth: defaultMonth });

    // 【核心改造】等待app.js中的Promise完成后再执行后续操作
    app.globalData.cloudPromise.then(cloud => {
      db = cloud.database();
      _ = db.command;

      // 获取背景图
      cloud.getTempFileURL({
        fileList: ['cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/diancai/background/delicious.png']
      }).then(res => {
        if (res.fileList.length > 0) this.setData({ bgImageUrl: res.fileList[0].tempFileURL });
      }).catch(error => console.error("获取统计页背景图失败", error));

      // 查询统计数据
      this.queryStats(defaultMonth);
    }).catch(err => {
      console.error('统计页加载共享云环境失败', err);
    });
  },

  onMonthChange(e) {
    const selectedMonth = e.detail.value;
    this.setData({ selectedMonth, rankedDishes: [], loading: true });
    this.queryStats(selectedMonth);
  },

  async queryStats(monthStr) {
    if (!db) return;
    try {
      const menuRes = await db.collection('diancai_daily_menus').where({
        date: db.RegExp({ regexp: '^' + monthStr })
      }).get();

      if (menuRes.data.length === 0) {
        this.setData({ rankedDishes: [], loading: false });
        return;
      }

      const dishCounts = menuRes.data.flatMap(item => item.dishes).reduce((acc, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});
      
      const uniqueDishIds = Object.keys(dishCounts);
      if (uniqueDishIds.length === 0) {
        this.setData({ rankedDishes: [], loading: false });
        return;
      }

      const dishesRes = await db.collection('diancai_dishes').where({
        _id: _.in(uniqueDishIds)
      }).get();
      
      const rankedDishes = dishesRes.data.map(dish => ({
        ...dish,
        count: dishCounts[dish._id]
      })).sort((a, b) => b.count - a.count);

      this.setData({ rankedDishes, loading: false });

    } catch (error) {
      console.error("统计查询失败", error);
      this.setData({ loading: false });
      wx.showToast({ title: '查询失败', icon: 'none' });
    }
  }
})