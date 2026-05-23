# AGENTS.md

## 通用规则

1. 用户表述中如果出现符号 `//`，则 `//` 后面的内容视为备注，执行时忽略。
2. 所有 look 必须独立处理，不跨 look 混合识别图片、单品、模特图或 JSON 数据。
3. 默认源图目录为：

   PNGnormal/look-###/

4. 默认数据文件为：

   data/outfits.json

---

# Look 图片处理规则

## 一、执行模式

### 1. 预览模式

如果用户只说“处理某些 look”，但没有明确说“开始执行”，先不修改文件，只输出预览。

预览内容包括：

- 每个 look 的识别结果
- 模特主图判断
- 单品图判断
- 重命名计划
- season 判断
- outfit.order 判断
- items 初步列表
- item.order 初步排序

等待用户确认后，再执行图片转换和 JSON 更新。

### 2. 直接执行模式

如果用户明确说以下类似指令：

- 开始执行
- 直接处理 look-###
- 继续处理 look-### 到 look-###

则直接执行完整流程：

1. 检查 PNGnormal/look-###/ 是否存在
2. 识别每个 look 内图片
3. 删除该 look 对应旧输出目录
4. 使用 ImageMagick 转换 webp
5. 更新 data/outfits.json
6. 检查路径、字段、尺寸和排序

---

## 二、图片输出规则

输出目录固定为：

images/look-###/thumbs/
images/look-###/large/

禁止输出到：

images/thumbs/
images/large/
PNGnormal/look-###/

处理某个 look 前，只允许删除该 look 对应旧目录：

images/look-###/thumbs/
images/look-###/large/

不得影响其他 look。

---

## 三、ImageMagick 规则

使用指定 ImageMagick：

E:\01 Software\ImageMagick-7.1.2-Q16-HDRI\magick.exe

转换规格：

- thumbs：400x400，webp
- large：1000x1000，webp

---

## 四、图片命名规则

模特主图命名为：

model.webp

单品图命名为：

item-english-kebab-name.webp

示例：

item-white-button-up-shirt.webp
item-blue-pleated-mini-skirt.webp
item-black-platform-shoes.webp

英文名称要求：

- 英文
- 小写
- 连字符
- 不使用中文
- 不使用空格
- 不使用特殊符号

如果某张图片无法明确判断是什么单品，文件名使用：

uncertain-01.webp

多个不确定单品依次命名：

uncertain-01.webp
uncertain-02.webp
uncertain-03.webp

JSON 中对应：

shape: "other"

---

## 五、outfits.json 顶层规则

更新文件：

data/outfits.json

每个 outfit 顶层字段只允许使用：

id
order
title
season
style
tags
thumb
large
description
items
scene

不得生成：

category
accessories

outfit.order 规则：

look 编号 × 10

示例：

look-001 -> 10
look-021 -> 210
look-040 -> 400

顶层 order 只控制整套 look 的页面显示顺序，不影响单品排序。

---

## 六、items 规则

所有非模特主图都必须放入 items 数组。

包括但不限于：

- 上衣
- 外套
- 裙子
- 裤子
- 袜子
- 鞋
- 包
- 帽子
- 围巾
- 发带
- 领结
- 领带
- 腰带
- 配饰

不得单独放入 accessories。

每个 item 必须包含：

name
nameEn
shape
note
thumb
large
order

item 图片路径规则：

thumb:
images/look-###/thumbs/item-english-name.webp

large:
images/look-###/large/item-english-name.webp

---

## 七、item.order 规则

每个 item 必须有 order。

item.order 控制同一个 look 内部单品显示顺序。

排序规则：

10 上身外层
20 上身内搭
30 下装
40 腿部袜类
50 鞋类
60 内衣类
70 包
80 帽子 / 围巾 / 发带 / 领结 / 领带 / 腰带
90 其他

同类多个 item 时，在基础 order 上递增。

示例：

上身外层：10、11、12
上身内搭：20、21、22
腿部袜类：40、41、42

同一个 look 内，不允许多个 item 使用完全相同的 order。

---

## 八、前端显示规则

首页、详情页等凡是显示 items 的地方，都必须按 item.order 从小到大排序。

不得只依赖 JSON 原始数组顺序。

---

## 九、图片处理完成后检查

每次处理完成后必须检查：

- outfit.thumb 路径是否真实存在
- outfit.large 路径是否真实存在
- 每个 item.thumb 路径是否真实存在
- 每个 item.large 路径是否真实存在
- 是否还有 accessories 字段
- 是否还有 category 字段
- 所有 outfit 是否都有 order
- 所有 item 是否都有 order
- 同一 look 内 item.order 是否重复
- thumbs 是否为 400x400
- large 是否为 1000x1000

---

# Look 文案更新规则

## 一、是否更新文本

图片处理完成后，询问用户是否更新文本。

如果用户回答“是”，进入文案更新流程；文案修改任务完成后，必须继续执行 item.note 网页显示检查。

如果用户回答“否”，继续询问用户是否执行 item.note 网页显示检查：

- 如果用户回答“是”，只执行 item.note 网页显示检查，不修改文案。
- 如果用户回答“否”，本次处理流程结束。

---

## 二、文案更新流程

### 1. 定位 look

在 data/outfits.json 中找到对应 look。

读取：

- outfit 的 large 模特图
- items 中每个单品的 large 图片

### 2. 看图重新判断

根据以下内容重新生成文案：

- model 整体穿搭
- 环境与季节感
- 单品实物图
- 整体气质
- 真实适合场景

不得照搬旧文本。

### 3. 先生成预览

批量修改时，先生成文案预览，不直接写入 JSON。

预览内容包括：

- title
- season
- style
- tags
- description
- scene
- 每个 item 的 name
- 每个 item 的 nameEn
- 每个 item 的 shape
- 每个 item 的 note

用户确认后，才写入 JSON。

### 4. 确认后写入

只更新对应 look 的文本字段。

不得修改：

- 图片路径
- id
- outfit.order
- item.order
- JSON 结构字段

---

## 三、整套文案规则

title：

- 3-6 字
- 文艺、优雅、自然
- 可以古风、现代、时尚
- 不能直白
- 不能拗口

season：

只能是以下四个值之一：

春季
夏季
秋季
冬季

根据 model 穿搭和环境判断。

style：

- 3-6 字左右
- 可以有 1-3 个风格词
- 按图片实际风格写

tags：

- 3-5 个
- 每个 2-3 个字
- 要高级、合理
- 不写太直白的颜色或材质词

description：

描述整套穿搭由什么组成、呈现什么气质、适合什么场景；文字要流畅优雅，不死板。

scene：

- 写真实适合穿这套衣服去的场景或地点
- 1-3 个
- 不把图片背景硬当作穿搭场景

---

## 四、单品文案规则

name：

- 3-8 字
- 优先体现款式、结构、材质、特点
- 不强行写颜色

nameEn：

- 和中文名对应
- 使用英文 kebab-case

shape：

按单品类别写，例如：

top
shirt
coat
dress
skirt
pants
socks
shoes
bag
hat
scarf
accessory
other

note：

只描述这个单品：

- 适合怎么搭配
- 适合什么场景
- 能增加什么人物气质

不得写：

- 命名规则
- 分类依据
- 预览说明
- 内部处理说明

---

## 五、袜子分类规则

白色短袜、中筒袜：

小白袜

高于中筒但不到膝盖：

颜色 + 小腿袜

超过膝盖但不是全腿：

颜色 + 过膝袜

全腿穿上：

颜色 + 连裤袜

丝袜质感：

必须包含 颜色 + 丝袜

丝袜且是连裤袜：

颜色 + 连裤丝袜

没有包脚、只是腿部覆盖：

腿套

示例：

米白针织腿套
黑色过膝袜
灰色小腿袜
黑色连裤丝袜

---

## 六、鞋子命名规则

鞋子名称必须根据图片准确判断。

不得使用：

乐福鞋

可使用：

制服鞋
玛丽珍鞋
高跟鞋
凉鞋
高跟凉鞋
穆勒鞋
短靴
长靴
运动鞋

尤其注意区分：

制服鞋
玛丽珍鞋

不得混用。

---

## 七、文案禁忌

不得在以下字段中写内部说明：

description
note
tags
scene

禁用词包括：

AI
预览
命名规则
按规则
统一归为
分类依据
内部说明

不得写不合理场景。

例如：

- 不因为背景是雪夜，就写“雪夜街巷”
- 不为了凑字强行堆颜色、材质或风格词
- 不写与穿搭实际气质无关的场景

---

## 八、文案更新后检查

写入 JSON 后必须检查：

- 只修改目标 look
- 未修改图片路径
- 未修改 id
- 未修改 outfit.order
- 未修改 item.order
- 未新增 category
- 未新增 accessories
- season 只使用四季之一
- nameEn 为英文 kebab-case
- shape 属于合理类别
- description、note、tags、scene 不包含内部说明词

---

## 九、item.note 网页显示检查

以下情况必须在实际网页中检查每个 items 的 note 显示效果：

- 图片处理完成后，用户选择更新文本，且文案修改任务已完成。
- 图片处理完成后，用户选择不更新文本，但随后明确选择执行网页检查。

检查规则：

- 打开对应 look 在网页中的实际显示页面。
- 按网页真实样式、真实宽度检查每个 item.note 的显示行数。
- 如果任一 item.note 在实际网页中显示超过两行，先不直接压缩文本，必须输出对应：
  - lookid
  - title
  - item name
- 输出超出两行的 item 列表后，询问用户是否要压缩文本内容，控制在两行内。
- 只有当用户明确回答“是”后，才执行压缩文本。
- 压缩文本时，只修改超过两行的 item.note。
- 不得修改图片路径、id、outfit.order、item.order、name、nameEn、shape 或 JSON 结构字段。
- 压缩后必须重新检查实际网页显示，确认对应 item.note 不超过两行。
