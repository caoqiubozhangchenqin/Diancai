// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { dishesToIncrement, dishesToDecrement } = event

    // 1. 处理需要增加计数的菜品
    if (dishesToIncrement && dishesToIncrement.length > 0) {
      await db.collection('dishes').where({
        _id: _.in(dishesToIncrement)
      }).update({
        data: {
          order_count: _.inc(1)
        }
      })
    }

    // 2. 处理需要减少计数的菜品
    if (dishesToDecrement && dishesToDecrement.length > 0) {
      await db.collection('dishes').where({
        _id: _.in(dishesToDecrement)
      }).update({
        data: {
          // 保证次数不会变成负数
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