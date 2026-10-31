---
title: Git
date: 2026-10-31 02:24:42
categories:
  - git
tags:
  - git
---

[Git](https://git-scm.com/) 是目前最流行的分布式版本管理系统，由 [Linus Torvalds](https://github.com/torvalds) 于 2005 年为管理 Linux 内核源码而创建。本文记录 git 的一些常见命令及基本使用方法，供个人查阅及速查。

### 一、 安装及配置

参考 [git 官方网站](https://git-scm.com/book/zh/v2/%E8%B5%B7%E6%AD%A5-%E5%AE%89%E8%A3%85-Git) 进行安装。

#### 查看 git 版本
```bash
git --version
```

#### 配置用户名及邮箱
这些信息用于记录提交作者，不是登录凭据。若要让 GitHub 关联提交，邮箱应使用账号中已验证的邮箱或 GitHub 提供的 noreply 邮箱；用户名可以自行设置。
```bash
git config --global user.name "your name"
git config --global user.email "your email"
```

#### 设置默认分支名（可选）
```bash
git config --global init.defaultBranch main
```

#### 查看配置
```bash
git config --global --list
```

### 二、创建或克隆 git 仓库

#### 初始化现有项目
在普通项目目录中，该命令会生成 `.git` 目录，用于保存 Git 的元数据和版本历史。
```bash
git init
```

#### 克隆远程仓库
`git clone`会自动下载项目文件及其版本历史，并默认将远程仓库命名为`origin`。
```bash
git clone https://github.com/username/repo.git
```

### 三、日常提交

本章介绍日常提交所使用到的最常用的 5 个命令。

#### status
用于查看当前分支，未跟踪文件，已修改文件和暂存区内容。
- -s: 简洁输出
```bash
git status
```

#### add
将改动加入暂存区。
```bash
git add .          # 暂存当前目录及子目录中的改动（忽略规则生效）
git add README.md  # 暂存指定文件的改动
```

#### diff
查看差异。`HEAD` 通常指向当前分支的最新提交；以下工作区差异命令不会显示未跟踪文件的内容。

| 命令 | 对比对象 | 功能 |
| --- | --- | --- |
| `git diff` | 工作区 <-> 暂存区 | 查看已跟踪文件中未暂存的更改 |
| `git diff --staged` | 暂存区 <-> HEAD | 查看已经暂存，即将提交的更改 |
| `git diff HEAD` | 工作区 <-> HEAD | 查看已跟踪文件相对最近一次提交的整体修改 |
| `git diff main..feature` | main <-> feature | 比较 main 和 feature 两个分支的差异 |

#### commit
提交已暂存的改动到 git 仓库。
```bash
git commit -m "提交信息"
```

常见提交信息前缀：
- feat：feature 的缩写，表示添加了新功能；
- fix：修复了 bug;
- docs：添加了文档；
- refactor：对代码进行重构;
- chore：杂项，如依赖，项目配置等。

#### log
查看提交历史。
```bash
git log
git log --oneline
```

### 四、分支管理

分支用于隔离不同功能的开发。
```bash
git branch     # 查看本地分支
git branch -a  # 查看本地和远程跟踪分支

git switch -c feature/login    # 创建并切换分支
git checkout -b feature/login  # 旧写法

git switch main    # 切换分支
git checkout main  # 旧写法

git branch -d feature/login  # 删除已经合并的分支

git fetch origin       # 更新远程跟踪分支
git merge origin/main  # 将 origin/main 合并到当前分支
```

### 五、远程连接

#### 查看远程连接
```bash
git remote -v
```

#### 添加远程连接
```bash
git remote add origin https://github.com/username/repo.git
```

#### 修改远程连接
```bash
git remote set-url origin https://github.com/username/new-repo.git
```

#### 拉取与推送
```bash
git fetch origin  # 拉取远程更新，但不合并
git pull  # 获取并整合当前分支的上游更新（取决于配置和参数）

git push  # 推送当前分支到已配置的上游
git push -u origin main  # 首次推送并绑定上游
```

#### 删除远程连接
```bash
git remote remove origin
# 等价写法：git remote rm origin
```

### 六、撤销修改

区分三个场景：

#### 修改了文件，还没 add
```bash
git restore README.md
```

这会丢弃`README.md`中尚未暂存的修改，无法保证找回。

#### 已经 add，但还没 commit
```bash
git restore --staged README.md
```

这会把该文件的暂存状态恢复到 `HEAD`，工作区中的修改仍然保留。新添加的文件取消暂存后会变成未跟踪文件。

#### 已经提交，需要撤销提交
- 推荐用于已推送，多人共享的场景。
```bash
git revert <commit-id>
```

将 `<commit-id>` 替换为实际提交哈希（无需尖括号）。它会生成一个**反向提交**，不直接修改既有历史；遇到冲突时需要先解决冲突。

- 仅用于尚未共享的本地提交。
```bash
git reset --soft HEAD~1   # 撤销最近一次提交，修改保存在暂存区
git reset --mixed HEAD~2  # 回退两次提交，保留工作区内容并清空暂存状态（默认模式）
git reset --hard HEAD~1   # 高危命令，它会移动当前分支，并丢弃受影响的已跟踪文件修改
```

### 七、临时保存

当前修改尚未完成，但需要切换分支，可以暂存工作现场。

#### 保存修改到 stash
```bash
git stash push -m "暂存信息"  # 暂存已跟踪文件的修改
git stash push -u -m "暂存信息"  # 同时包含未跟踪文件
```

#### 查看 stash 记录
```bash
git stash list
```

#### 恢复 stash 中的修改
```bash
git stash pop
```

> stash pop 遇到冲突时可能不会删除对应记录，应该通过 stash list 查看。

### 八、忽略规则

可以通过`.gitignore`文件记录不需要 git 追踪的文件。
示例：
```
# 操作系统文件
.DS_Store

# 编辑器文件
.vscode/

# 环境配置文件
.env

# 日志文件
*.log
```

`.gitignore`主要影响未被 git 跟踪的文件。如果一个文件已经提交过，添加忽略规则不会自动停止跟踪。可通过以下命令取消跟踪：
```bash
git rm --cached .env
git commit -m "chore: stop tracking env file."
```

这会停止在后续版本中跟踪该文件，但不会清除它在历史提交中的内容。**如果密钥已经提交或推送，应立即轮换密钥。**

### 九、常用命令速查表

| 需求 | 命令 |
| --- | --- |
| 查看 Git 版本 | `git --version` |
| 初始化仓库 | `git init` |
| 克隆仓库 | `git clone <url>` |
| 查看状态 | `git status` |
| 暂存文件 | `git add <file>` |
| 查看未暂存差异 | `git diff` |
| 查看已暂存差异 | `git diff --staged` |
| 提交 | `git commit -m "message"` |
| 查看历史 | `git log --oneline` |
| 创建并切换分支 | `git switch -c <branch>` |
| 切换分支 | `git switch <branch>` |
| 合并分支 | `git merge <branch>` |
| 查看远程地址 | `git remote -v` |
| 获取远程更新 | `git fetch` |
| 拉取并整合更新 | `git pull` |
| 推送提交 | `git push` |
| 通过新提交撤销旧提交 | `git revert <commit>` |
| 临时保存修改 | `git stash push` |
