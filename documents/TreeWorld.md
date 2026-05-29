- #Project
- **定位：** 人和 Agent 共享的无限画布桌面软件。对话是临时的，画布是永恒的。
- **灵感来源：** 聊天软件是降维通道，Agent 的能力被压缩成文本。画布是比聊天窗口更高级的交互介质。
- **开发工具：** Claude Code + MiMo（vibe coding）
- ## 核心机制
	- **① 对话是浮动的，不是固定的**
		- 没有聊天框。按快捷键弹出气泡对话框，说完就消失。对话是手段，不是界面。
	- **② 输出即画布内容**
		- Agent 的回复不是一段文字，而是直接在画布上生成对应的东西：
		  | Agent 输出 | 画布上的形态 |
		  | ---- | ---- | ---- |
		  | 文档/总结 | MD 块 |
		  | 小提示/提醒 | 便签块 |
		  | 叮嘱/备忘 | 气泡留言块 |
		  | 网页/交互原型 | HTML 块 |
		  | 找到的素材 | 图片/链接块 |
		  | 一个完整任务的产出 | 集合框（collection） |
	- **③ 集合框是组织单位**
		- Agent 收到任务后，自己在画布上创建一个集合框，然后往里面填充内容。
		- 人不需要手动整理——Agent 做完任务后，画布上多出来的是一个结构化的成果。
		- 集合框支持嵌套，大主题里分小主题。
		- **放置规则：** 默认放在当前视口中心偏右下，避让已有块，找空地放。
	- **④ 锁定机制**
		- 人可以锁定画布上的任意块，被锁定的块不能被 Agent 移动或修改。
		- Agent 可以自由移动未锁定的内容。
		- **冲突处理：** Agent 需要更新锁定块时，反问用户"这个块锁定了，要解锁吗？"而不是绕过。
- ## 跟现有产品的区别
	- Notion — 人写，AI 补全。画布是人的，AI 是助手。
	- Miro — 人画，AI 建议。画布是人的，AI 是顾问。
	- Claude Desktop — AI 写，人看。画布是 AI 的，人是观众。
	- **TreeWorld — 人和 Agent 都能操作画布。画布是共享的，双方都是主人。**
- ## 技术选型
	- **框架：** React + Vite（Web 版优先，桌面化是后续步骤）
	- **渲染引擎：** DOM + CSS Transform（每个块是 HTML 元素，用 CSS transform 实现 pan/zoom）
	- **状态管理：** Zustand
	- **为什么先做 Web：** Electron/Tauri 的环境配置和进程通信会在早期消耗大量精力。Web 版跑通核心体验后，套 Electron 壳只需少量配置。
	- **性能风险：** 每个 HTML 块是 iframe，50+ 个同时渲染内存压力大。MVP 后期加入 HTML 块前做一次压力测试。
- ## Agent 接入
	- **双接口架构：** 同时支持云端 API 和本地模型，用户自选
	- **云端：** Claude / GPT 等（大部分用户会选这个）
	- **本地：** Ollama / LM Studio 等（有本地模型能力的用户）
	- **完全本地优先：** 数据存储在本地，不强制上云
- ## 画布指令集（Canvas Command Protocol）
	- Agent 和画布渲染器之间的通信协议：
	- ### 块类型（MVP）
		- `markdown` — MD 文档
		- `note` — 便签
		- `bubble` — 气泡留言
		- `image` — 图片
		- `html` — HTML 交互组件（阶段三）
		- `collection` — 集合框（容器）
	- ### 指令类型
		- `canvas.create` — 创建块
		- `canvas.update` — 更新内容
		- `canvas.move` — 移动块
		- `canvas.resize` — 缩放块
		- `canvas.lock` — 锁定/解锁
		- `canvas.delete` — 删除块
		- `canvas.group` — 放入集合框
		- `canvas.batch` — 批量操作（Agent 完成任务时用）
		- `canvas.query` — 查询块详情
	- ### 画布状态同步
		- **视口推送：** 每次对话只推当前视口内的块摘要给 Agent（位置、类型、标题）
		- **按需查询：** Agent 需要操作具体块时，发 `canvas.query(blockId)` 获取完整内容
		- **复杂度提示：** 画布超过 100 个块时，提示用户"画布较复杂，Agent 可能需要更多确认"
		- **层级语义匹配：**
			- 每个块有 `parentCollectionId`（在哪个集合里）
			- Agent 做语义匹配时先匹配 block title/content，再检查层级关系
			- 匹配到子级只操作子级，匹配到父级操作整个容器
			- 模糊匹配时 Agent 反问确认（如"你说的是调研报告还是调研A的内容？"）
- ## 数据结构
	- ```
	  interface Block {
	    id: string
	    type: 'markdown' | 'note' | 'bubble' | 'html' | 'image' | 'collection'
	    x: number
	    y: number
	    width: number
	    height: number
	    content: string
	    locked: boolean
	    parentCollectionId: string | null
	    title: string
	    createdBy: 'user' | 'agent'
	    createdAt: number
	  }
	  
	  interface CanvasState {
	    blocks: Record<string, Block>
	    camera: { x: number; y: number; zoom: number }
	  }
	  ```
- ## HTML 块安全沙箱方案
	- 每个 HTML 块用 `<iframe sandbox="allow-scripts">` 渲染
	- 允许 JS 执行，但默认禁止：访问父页面 DOM、调用 fetch、读取本地文件、嵌套 iframe
	- 执行超时：JS 运行超过 5 秒自动 kill
	- 内存限制：超过阈值强制刷新
	- Agent 生成的 HTML 可以做：CSS 动画、DOM 操作（仅 iframe 内部）、简单计算、SVG 内嵌、事件监听
	- 不能做：读写本地文件、发网络请求（除非白名单）、访问画布其他块、弹系统级窗口
- ## MVP（三阶段）
	- [[MVP阶段1-静态画布]] — 验证画布本身好不好用
	- [[MVP阶段2-接入Agent]] — 验证 Agent→画布链路能否跑通
	- [[MVP阶段3-结构化输出]] — 验证集合框和多块类型的体验
	- ### 不做（后续版本）
		- SVG 块（HTML 块内嵌 SVG 替代）
		- Canvas 2D 块
		- 本地模型接入
		- 多 session 管理
		- 导出/分享
		- 套 Electron 壳变桌面软件
- ## 交互流程
	- 1. 用户按 / 或快捷键 → 浮动气泡输入框出现
	- 2. 用户输入指令 → 气泡消失，画布出现"思考中..."状态
	- 3. Agent 调 API → 生成画布指令
	- 4. Agent 在画布上创建集合框，标题匹配任务
	- 5. 集合框内依次出现：MD 块、图片块、HTML 块等
	- 6. 用户在画布上直接拖拽、编辑、锁定
- ## 文件结构
	- ```
	  treeworld/
	  ├── src/
	  │   ├── canvas/
	  │   │   ├── camera.ts
	  │   │   ├── renderer.ts
	  │   │   └── commands.ts
	  │   ├── blocks/
	  │   │   ├── MarkdownBlock.tsx
	  │   │   ├── NoteBlock.tsx
	  │   │   └── CollectionBlock.tsx
	  │   ├── agent/
	  │   │   ├── provider.ts
	  │   │   ├── anthropic.ts
	  │   │   └── openai.ts
	  │   ├── chat/
	  │   └── store.ts
	  ├── index.html
	  ├── vite.config.ts
	  └── package.json
	  ```
