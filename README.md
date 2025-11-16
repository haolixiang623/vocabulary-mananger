# 浏览器端单词管理系统

基于Supabase和MCP的浏览器端单词管理系统，支持单词管理、标签管理、搜索和Excel导出功能。

## 功能特性

- ✅ 用户认证（注册、登录、邮箱验证）
- ✅ 单词管理（添加、编辑、删除、批量导入）
- ✅ 标签管理（创建、编辑、删除）
- ✅ 标签搜索（多标签AND查询）
- ✅ Excel导出（包含单词、标签、复习记录）
- ✅ Excel批量导入（支持模板下载）

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **数据库**: Supabase (PostgreSQL)
- **连接方式**: MCP (Model Context Protocol)
- **Excel处理**: SheetJS (xlsx.js)

## 快速开始

### 1. 配置Supabase

1. 在 [Supabase](https://supabase.com) 创建新项目
2. 获取项目URL和anon key
3. 在SQL Editor中执行 `database/schema.sql` 脚本
4. 更新 `js/config.js` 中的配置信息

### 2. 配置MCP（可选）

如果需要使用MCP连接，请配置 `js/config.js` 中的 `MCP_SERVER_URL`。

### 3. 运行项目

直接在浏览器中打开 `index.html` 文件，或使用本地服务器：

```bash
# 使用Python
python -m http.server 8000

# 使用Node.js
npx http-server
```

然后访问 `http://localhost:8000`

## 项目结构

```
vocabulary-manager/
├── index.html              # 主页面
├── css/
│   └── style.css          # 样式文件
├── js/
│   ├── config.js         # 配置文件
│   ├── supabase-client.js # Supabase客户端
│   ├── mcp-client.js      # MCP连接客户端
│   ├── auth.js            # 认证模块
│   ├── word-service.js    # 单词服务
│   ├── tag-service.js     # 标签服务
│   ├── export-service.js  # 导出服务
│   └── app.js             # 主应用逻辑
├── database/
│   └── schema.sql        # 数据库Schema
└── README.md
```

## 使用说明

### 注册和登录

1. 首次使用需要注册账号
2. 注册后需要验证邮箱
3. 验证后可以登录使用

### 添加单词

1. 点击"添加单词"按钮
2. 输入单词和中文释义
3. 选择或创建标签
4. 点击"保存"

### 管理标签

1. 点击"管理标签"按钮
2. 可以添加、编辑、删除标签
3. 删除标签时会显示关联的单词数量

### 搜索单词

1. 在标签选择区域选择标签
2. 点击"搜索"按钮
3. 系统会显示同时关联所有选中标签的单词

### 导出Excel

1. 点击"导出Excel"按钮
2. 系统会生成包含所有单词数据的Excel文件
3. 文件名格式：`单词管理记录_YYYYMMDD.xlsx`

### 导入Excel

1. 点击"导入Excel"按钮
2. 选择Excel文件（可使用模板）
3. 系统会解析并导入数据
4. 显示导入结果

## 开发计划

详细开发计划请参考 `代码执行计划.md`

## 许可证

MIT License
