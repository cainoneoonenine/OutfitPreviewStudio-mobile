# Outfit Preview Studio

A mobile-first fashion lookbook for showcasing outfit previews on AI models.

这个项目是一个静态前端网页项目，不包含电商、购物车、支付、登录、后端或数据库。它适合部署到 GitHub Pages。

## 功能

- 移动端优先的 Lookbook 布局
- 首页入口页
- 穿搭列表页
- 分类筛选
- 标签展示
- 穿搭详情页
- 使用 localStorage 保存收藏
- 使用 JSON 管理穿搭数据

## 文件说明

- `index.html`: 首页入口，展示品牌首屏和“探索”按钮。
- `list.html`: 穿搭图册页，展示分类筛选和 outfit 卡片列表。
- `outfit.html`: 详情页，根据 URL 中的 `id` 显示单个 outfit。
- 收藏功能：通过页面内浮层显示 localStorage 里的已收藏穿搭，不再使用独立收藏页。
- `styles.css`: 全站视觉样式，包含移动端优先布局、卡片、标签、按钮和详情页样式。
- `script.js`: 读取 JSON、渲染列表、分类筛选、详情页显示、收藏与取消收藏逻辑。
- `data/outfits.json`: 所有 outfit 数据。
- `images/look-001/thumbs/`: 每套 look 的缩略图文件夹，建议 400 x 400。
- `images/look-001/large/`: 每套 look 的大图文件夹，建议 1000 x 1000。

## How to add new outfits

1. 为新 look 创建独立文件夹：
   - `images/look-009/thumbs/`
   - `images/look-009/large/`
2. 准备 model 和 item 图片：
   - `images/look-009/thumbs/model.webp`
   - `images/look-009/large/model.webp`
   - `images/look-009/thumbs/item-example-name.webp`
   - `images/look-009/large/item-example-name.webp`
3. 在 `data/outfits.json` 里新增一条数据：

```json
{
  "id": "look-009",
  "title": "新穿搭标题",
  "category": "春季",
  "tags": ["柔和", "日常"],
  "thumb": "images/look-009/thumbs/model.webp",
  "large": "images/look-009/large/model.webp",
  "description": "这套穿搭的简短描述。",
  "items": [
    {
      "name": "示例上衣",
      "nameEn": "example top",
      "thumb": "images/look-009/thumbs/item-example-top.webp",
      "large": "images/look-009/large/item-example-top.webp",
      "note": "单品说明"
    }
  ],
  "scene": "影棚穿搭图册预览",
  "styleNotes": "这套穿搭的风格说明。"
}
```

4. 保存文件。
5. 本地预览，确认列表页、详情页和收藏浮层正常。
6. 上传 GitHub。
7. 如果已经开启 GitHub Pages，GitHub Pages 会自动更新。

注意：`id` 必须唯一。图片路径必须使用相对路径，不要写 Windows 本地路径。

## 本地预览

不要直接双击打开 HTML 文件，因为浏览器可能会阻止 `data/outfits.json` 的读取。

推荐方式：

1. 用 VS Code 打开项目文件夹。
2. 安装并启用 Live Server 扩展。
3. 右键 `index.html`，选择 `Open with Live Server`。

也可以使用简单本地服务器：

```bash
python -m http.server 5500
```

然后在浏览器打开：

```text
http://localhost:5500/
```

## GitHub Pages

当你准备发布时，可以把这些文件上传到 GitHub 仓库，然后在仓库 Settings 中开启 GitHub Pages。

常用流程：

```bash
git add .
git commit -m "Create Outfit Preview Studio"
git push
```

进入 GitHub 仓库：

1. 打开 `Settings`
2. 打开 `Pages`
3. Source 选择你的分支，例如 `main`
4. Folder 选择 `/root`
5. 保存后等待 GitHub Pages 生成链接

## 图片说明

如果页面不显示图片，最常见原因是：

- 图片文件还没有放进对应的 `images/look-xxx/thumbs/` 或 `images/look-xxx/large/`
- 文件名和 `data/outfits.json` 中写的不一致
- 图片后缀不一致，例如 JSON 写 `.webp`，实际文件是 `.jpg`
- 路径写成了本地绝对路径，例如 `E:\...`

## JSON 说明

如果页面提示无法读取穿搭数据：

- 确认你正在使用 Live Server 或本地服务器预览。
- 检查 `data/outfits.json` 是否是合法 JSON。
- JSON 最后一条数据后不要多写逗号。
- 确认文件路径仍然是 `data/outfits.json`。
