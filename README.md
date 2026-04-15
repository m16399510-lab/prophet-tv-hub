# 预言家TV文游合集

这是一个已经能直接打开预览的静态站点骨架，分成两部分：

- `index.html`：前台首页，展示公告、搜索栏、作品入口和进度信息。
- `admin.html`：管理员端，可修改公告、增删改作品资料。

## 现在怎么用

1. 直接双击打开 [index.html](D:\prophet-tv-hub\index.html) 看前台。
2. 双击打开 [admin.html](D:\prophet-tv-hub\admin.html) 进后台。
3. 当前默认账号：
   - 用户名：`admin`
   - 密码：`prophet-tv`

## 目前的数据模式

- 默认是本地演示模式。
- 也就是说，你在后台改的内容，会保存在当前浏览器的本地存储里。
- 这很适合先确定页面结构和内容，不需要先折腾服务器。

## 想正式上线时怎么做

1. 在 Supabase 新建项目。
2. 打开 [sql/schema.sql](D:\prophet-tv-hub\sql\schema.sql)，把里面的 SQL 复制到 Supabase 的 SQL Editor 里执行。
3. 打开 [js/config.js](D:\prophet-tv-hub\js\config.js)，把：
   - `storageMode` 改成 `supabase`
   - `supabase.url` 填成你的项目地址
   - `supabase.anonKey` 填成匿名 key
4. 回到 Supabase，把默认管理员密码改掉。

## 封面和链接怎么改

- 每个作品的封面都可以在后台的“封面地址”里改。
- 现在示例封面在 [assets/covers](D:\prophet-tv-hub\assets\covers) 目录。
- 作品入口、下载地址、群链接、API 链接，都能在后台直接改。

## 如果你想继续扩

- 继续加更多作品：直接进后台新增即可。
- 想换成你自己的视觉图：替换 `assets/covers` 里的 SVG，或者在后台填新图地址。
- 想加“收费说明页”“活动日志页”“开发会议页”，可以在这个骨架上继续接着搭。
