// components/calendar/calendar.js
Component({
  properties: {
    // 接收一个数组，里面是本月需要标记的日期数字，例如 [1, 15, 28]
    markedDays: {
      type: Array,
      value: [],
      // 当 markedDays 数据变化时，重新计算日历以应用标记
      observer: function(newVal, oldVal) {
        this.calculateDays(this.data.year, this.data.month);
      }
    }
  },
  data: {
    year: 0,
    month: 0,
    days: [],
    emptyGrids: [],
    selectedDay: 0,
  },
  lifetimes: {
    attached: function() {
      const date = new Date();
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      this.setData({
        year,
        month,
        selectedDay: day,
      });
      this.calculateDays(year, month);
      // 组件加载时就通知主页获取第一个月的菜单数据
      this.triggerEvent('monthChange', { year, month });
    }
  },
  methods: {
    getDaysInMonth(year, month) {
      return new Date(year, month, 0).getDate();
    },
    getFirstDayOfWeek(year, month) {
      return new Date(year, month - 1, 1).getDay();
    },
    calculateDays(year, month) {
      const daysInMonth = this.getDaysInMonth(year, month);
      const firstDayOfWeek = this.getFirstDayOfWeek(year, month);
      const { markedDays } = this.data; // 获取需要标记的日期数组

      let days = [];
      for (let i = 1; i <= daysInMonth; i++) {
        // 检查当天是否在标记数组中
        days.push({
          day: i,
          hasMenu: markedDays.includes(i) // 如果包含，hasMenu就为true
        });
      }
      
      let emptyGrids = [];
      for (let i = 0; i < firstDayOfWeek; i++) {
        emptyGrids.push(i);
      }
      
      this.setData({
        days,
        emptyGrids,
      });
    },
    prevMonth() {
      let { year, month } = this.data;
      if (month === 1) {
        year--;
        month = 12;
      } else {
        month--;
      }
      this.setData({ year, month });
      this.calculateDays(year, month);
      // 触发事件，通知主页月份变了
      this.triggerEvent('monthChange', { year, month });
    },
    nextMonth() {
      let { year, month } = this.data;
      if (month === 12) {
        year++;
        month = 1;
      } else {
        month++;
      }
      this.setData({ year, month });
      this.calculateDays(year, month);
      // 触发事件，通知主页月份变了
      this.triggerEvent('monthChange', { year, month });
    },
    selectDay(e) {
      const day = e.currentTarget.dataset.day;
      if (day) { // 防止点击空白处
        this.setData({ selectedDay: day });
        const { year, month } = this.data;
        this.triggerEvent('daySelect', { year, month, day });
      }
    }
  }
})