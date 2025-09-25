// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // event.dishIds 会接收到小程序端传来的菜品ID数组
    const { dishIds } = event

    if (!dishIds || dishIds.length === 0) {
      return { success: false, message: '菜品ID为空' }
    }

    // 使用 inc 指令，为所有在 dishIds 数组中的菜品，其 order_count 字段自增1
    const updateResult = await db.collection('dishes').where({
      _id: _.in(dishIds)
    }).update({
      data: {
        order_count: _.inc(1)
      }
    })

    return {
      success: true,
      stats: updateResult.stats
    }
  } catch (e) {
    console.error(e)
    return {
      success: false,
      error: e
    }
  }
}