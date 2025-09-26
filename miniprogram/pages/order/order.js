// pages/order/order.js
const app = getApp();
let cloud, db, _; // 将cloud, db, command声明在页面作用域

Page({
  data: {
    date: '',
    groupedDishes: [],
    selectedDishes: [],
    selectedDishesMap: {},
    bgImageUrl: ''
  },

  onLoad(options) {
    this.setData({ date: options.date || new Date().toISOString().split('T')[0] });

    // 等待app.js中的Promise完成后再执行后续操作
    app.globalData.cloudPromise.then(cloudInstance => {
      cloud = cloudInstance; // 保存cloud实例，用于调用云函数
      db = cloud.database();
      _ = db.command;

      // 获取背景图
      cloud.getTempFileURL({
        fileList: ['cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-ge5gomsffe800a7-1373366709/diancai/background/diancai.png']
      }).then(res => {
        if (res.fileList.length > 0) this.setData({ bgImageUrl: res.fileList[0].tempFileURL });
      }).catch(error => console.error("获取点菜页背景图失败", error));
      
      // 加载菜单
      this.fetchDishes();

    }).catch(err => {
      console.error('点菜页加载共享云环境失败', err);
    });
  },

  // 【核心改造】重构fetchDishes函数，增加图片链接转换逻辑
  async fetchDishes() {
    if (!db) return;
    wx.showLoading({ title: '加载菜单中...' });

    try {
      // 1. 从数据库获取菜品原始数据
      const res = await db.collection('diancai_dishes').get();
      const dishes = res.data;

      if (dishes.length === 0) {
        wx.showToast({ title: '菜单为空', icon: 'none' });
        this.setData({ groupedDishes: [] });
        return; // 记得在return前把loading关掉，或者用finally
      }

      // 2. 提取所有需要转换的 image_url (File ID)
      const fileIDs = dishes
        .map(dish => dish.image_url)
        .filter(url => url && url.startsWith('cloud://')); // 过滤掉空URL和已经是http的URL

      // 3. 如果有需要转换的File ID，则一次性调用API进行转换
      if (fileIDs.length > 0) {
        const tempFilesRes = await cloud.getTempFileURL({ fileList: fileIDs });
        const tempUrlMap = new Map(
          tempFilesRes.fileList.map(file => [file.fileID, file.tempFileURL])
        );

        // 4. 将获取到的临时链接，作为一个新属性添加到每个菜品对象上
        dishes.forEach(dish => {
          if (dish.image_url && tempUrlMap.has(dish.image_url)) {
            dish.temp_image_url = tempUrlMap.get(dish.image_url);
          }
        });
      }
      
      // 5. 按 category 分组
      const grouped = dishes.reduce((acc, dish) => {
        const category = dish.category || '未分类';
        if (!acc[category]) acc[category] = [];
        acc[category].push(dish);
        return acc;
      }, {});
      const groupedDishes = Object.keys(grouped).map(category => ({
        category: category,
        dishes: grouped[category]
      }));
      
      // 6. 更新页面数据
      this.setData({ groupedDishes });

    } catch (err) {
      console.error("获取菜品列表或转换图片链接失败", err);
      wx.showToast({ title: '加载菜单失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  onCardTap(e) {
    const { dishid } = e.currentTarget.dataset;
    const { selectedDishesMap } = this.data;
    const newSelectedDishesMap = { ...selectedDishesMap };

    if (newSelectedDishesMap[dishid]) {
      delete newSelectedDishesMap[dishid];
    } else {
      newSelectedDishesMap[dishid] = true;
    }
    
    this.setData({
      selectedDishesMap: newSelectedDishesMap,
      selectedDishes: Object.keys(newSelectedDishesMap)
    });
  },

  async submitMenu() {
    if (!db || !cloud) return;
    wx.showLoading({ title: '提交中...' });
    
    const { date, selectedDishes: newDishes } = this.data;
    
    try {
      const res = await db.collection('diancai_daily_menus').where({ date }).get();
      const oldDishes = res.data.length > 0 ? res.data[0].dishes || [] : [];
      
      const newDishesSet = new Set(newDishes);
      const oldDishesSet = new Set(oldDishes);
      const dishesToIncrement = newDishes.filter(id => !oldDishesSet.has(id));
      const dishesToDecrement = oldDishes.filter(id => !newDishesSet.has(id));

      if (res.data.length > 0) {
        await db.collection('diancai_daily_menus').doc(res.data[0]._id).update({ data: { dishes: newDishes } });
      } else {
        await db.collection('diancai_daily_menus').add({ data: { date, dishes: newDishes } });
      }

      this.handleSubmitSuccess(dishesToIncrement, dishesToDecrement);

    } catch (err) {
      this.handleSubmitFail(err);
    }
  },

  handleSubmitSuccess(dishesToIncrement, dishesToDecrement) {
    wx.hideLoading();
    wx.showToast({ title: this.data.selectedDishes.length > 0 ? '提交成功！' : '菜单已清空！' });
    
    if (dishesToIncrement.length > 0 || dishesToDecrement.length > 0) {
      cloud.callFunction({
        name: 'diancai_updateDishCount',
        data: { dishesToIncrement, dishesToDecrement }
      }).then(res => {
        console.log('差量更新点菜次数成功', res);
      }).catch(err => {
        console.error('差量更新点菜次数失败', err);
        wx.showToast({ title: '同步点菜次数失败', icon: 'none' });
      });
    }

    setTimeout(() => wx.navigateBack(), 1500);
  },

  handleSubmitFail(err) {
    wx.hideLoading();
    console.error('提交菜单失败', err);
    wx.showToast({ title: '提交失败，请重试', icon: 'error' });
  }
})