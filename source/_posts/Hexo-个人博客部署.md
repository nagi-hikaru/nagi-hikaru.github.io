---
title: Hexo 个人博客部署
date: 2026-10-24 01:19:59
tags:
  - hexo
---

Hexo 是一个基于 Node.js 的静态博客框架，生成速度快、主题丰富，适合用来搭建个人博客。本文记录从零开始使用 Hexo 搭建个人博客并部署到 GitHub Pages 的完整流程。

### 一、环境准备

在开始之前，需要先安装以下工具：

- [Node.js](https://nodejs.org/)：建议安装 LTS 版本
- [Git](https://git-scm.com/)：用于版本管理和部署
- GitHub 账号：用于托管博客代码和静态页面

安装完成后，可以在终端中检查版本：
```bash
node -v
npm -v
git --version
```

### 二、本地运行 Hexo 博客

#### 安装 Hexo

全局安装 Hexo CLI：
```bash
npm install -g hexo-cli
```
安装完成后，检查是否安装成功：
```bash
hexo -v
```

#### 创建博客项目

选择一个存放博客的目录，执行：
```bash
hexo init my-blog
cd my-blog
npm install
```

其中 my-blog 是博客项目目录名，可以按需修改。
初始化完成后，项目目录大致如下：
```text
my-blog
├── _config.yml
├── package.json
├── scaffolds
├── source
│   └── _posts
└── themes
```

其中：
- _config.yml：Hexo 主配置文件
- source/_posts：博客文章目录
- themes：主题目录
- scaffolds：文章模板目录

#### 本地预览

启动本地服务：
```bash
hexo server
```

默认访问地址：http://localhost:4000

如果希望修改端口，可以执行：
```bash
hexo server -p 5000
```

#### 修改博客配置
修改项目根目录下的 `_config.yml` 文件，如果更换了主题可能需要修改主题对应的配置文件。

#### 常用命令
```bash
hexo new "博客名"  // 创建文章
hexo clean        // 清理 public/ 目录
hexo generatet    // 生成 public/ 目录
hexo server       // 预览博客
```

### 三、部署到 Github Page

#### 创建 Github 仓库

在 GitHub 上创建一个 public 仓库。如果希望使用默认域名访问，仓库名建议为：
```text
用户名.github.io
```
例如我的就是：
```text
nagi-hiakru.github.io
```

#### 配置 git 忽略规则
创建 `.gitignore` 文件，一般包含：
```text
node_modules/
public/
db.json
*.log
.DS_Store
Thumbs.db
```

`source/`，`_config.yml`，`package.json`和`package-lock.json`需要纳入 git 版本管理。

#### 配置 Github Actions 自动部署
在项目根目录创建文件：
```text
.github/workflows/pages.yml
```

复制以下内容，可以让 AI 适当修改：
```yml
name: Deploy Hexo to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: github-pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Generate Hexo site
        run: npx hexo generate

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4

```

#### 推送代码到仓库
在终端执行如下命令：
```bash
git init
git add .
git commit -m "Initial Hexo blog"
git remote add origin 仓库地址
git push -u origin main
```

#### 在 Github 上开启 Pages
1. 打开刚才的 Github 仓库；
2. 点击 `Settings -> Pages`;
3. 在 `Build and deployment -> Source`中选择 `Github Actions`；
4. 进入仓库的 Actions 标签，查看 `Deploy Hexo to Github Pages`工作流；
5. 等待构建和部署两个 Job 都显示成功；
6. 访问 `https://用户名.github.io`。

### 四、自定义你的博客
可以访问[Hexo 主题](https://hexo.node.org.cn/themes/)，挑选自己喜欢的主题，本站的主题就是其中的**redefine**魔改版。

---

以上就是用[Hexo](https://hexo.io/zh-cn/)配置个人博客并部署到 Gihhub Page 的完整流程。
