---
title: Lima
date: 2026-10-31 19:59:22
category:
  - linux
tags:
  - lima
  - linux
---

[Lima](https://lima-vm.io/)（Linux Machines）是一款开源的虚拟机管理工具，可以通过命令行快速创建和管理 Linux 虚拟机。它支持自动文件共享和端口转发，让宿主机与虚拟机之间的协作更加方便，体验类似于 Windows 上的 WSL2。对于需要在 macOS 上使用 Linux 开发环境、运行容器或测试服务的用户，Lima 提供了一种简洁、灵活的选择。

> What is Lima?
> Lima launches Linux virtual machines with automatic file sharing and port forwarding (similar to WSL2).

### 一、安装

macOS 上可以通过 Homebrew 安装：

```zsh
brew install lima
```

### 二、使用

Lima 使用 `limactl` 管理虚拟机，每台虚拟机称为一个实例。下面以使用 `ubuntu-22.04` 模板创建名为 `xv6-oslab` 的实例为例。

#### 创建实例

使用 Ubuntu 22.04 模板创建实例，并指定名称：

```zsh
limactl create --name=xv6-oslab template:ubuntu-22.04
```

按终端提示确认配置即可。`create` 会准备实例，但不会启动虚拟机；首次创建时可能需要下载系统镜像。

常用可选参数：

- `template:<模板名>`：指定创建实例所用的模板，本例为 `template:ubuntu-22.04`。
- `--name=<名称>`：指定实例名称，后续启动、进入终端和停止操作也需要使用该名称。
- `--cpus=<数量>`：指定 CPU 数量。
- `--memory=<大小>`：指定内存大小，单位为 GiB。
- `--disk=<大小>`：指定虚拟磁盘容量，单位为 GiB。

#### 启动实例

启动已经创建的实例：

```zsh
limactl start xv6-oslab
```

首次启动时需要初始化系统环境，耗时取决于网络和机器性能。终端出现 `READY` 后，即可进入实例。

如果还没有创建实例，也可以直接执行以下命令，一步创建并启动 `xv6-oslab`：

```zsh
limactl start --name=xv6-oslab template:ubuntu-22.04
```

通过以下命令查看所有实例的名称和运行状态：

```zsh
limactl list
```

#### 进入终端

实例启动后，进入它的交互式 Shell：

```zsh
limactl shell xv6-oslab
```

#### 停止实例

先通过 `exit` 返回 macOS 终端，再停止实例：

```zsh
limactl stop xv6-oslab
```

### 三、模板

Lima 官方提供了很多开箱即用的模板，参考 [官方模板文档](https://lima-vm.io/docs/templates/)。

### 四、配置

参考 [官方配置文档](https://lima-vm.io/docs/config/)。
