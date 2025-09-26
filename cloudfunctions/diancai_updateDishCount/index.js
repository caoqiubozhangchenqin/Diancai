// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 这行代码让云函数自动适应部署的环境，无需改动
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { dishesToIncrement, dishesToDecrement } = event

    // 1. 处理需要增加计数的菜品
    if (dishesToIncrement && dishesToIncrement.length > 0) {
      // 【核心修改】将集合名称从 'dishes' 改为 'diancai_dishes'
      await db.collection('diancai_dishes').where({
        _id: _.in(dishesToIncrement)
      }).update({
        data: {
          order_count: _.inc(1)
        }
      })
    }

    // 2. 处理需要减少计数的菜品
    if (dishesToDecrement && dishesToDecrement.length > 0) {
      // 【核心修改】将集合名称从 'dishes' 改为 'diancai_dishes'
      await db.collection('diancai_dishes').where({
        _id: _.in(dishesToDecrement)
      }).update({
        data: {
          order_count: _.inc(-1)
        }
      })
    }

    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: e }
  }
}