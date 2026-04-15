/*  mock-data.js — 聚合器
 *  各作品数据由 data/*.js 独立注册到 window.PROPHET_TV_GAMES[]
 *  此文件只负责整合它们，并提供公告配置。
 */
window.PROPHET_TV_DEFAULT_DATA = {
    bulletin: {
        eyebrow: '公告说明区',
        title: '欢迎来到本杰驴的魔法世界',
        body: ''
    },
    games: window.PROPHET_TV_GAMES || []
};
