---
title: Docker
date: 2026-11-10 19:26:30
category:
  - docker
tags:
  - docker
---

[Docker](https://www.docker.com/) 是一个主要使用 [Go](https://golang.google.cn/) 语言开发的容器化平台。以本文介绍的 Linux 容器为例，容器共享 Docker Engine 所在 Linux 系统的内核，而不必像传统虚拟机那样运行独立的客体操作系统。这种设计使 Docker 容器轻便、快速且便携，同时保持彼此隔离。本文整理了 Docker 入门中的常用操作，方便学习和日常查阅。

### 一、Docker Official

- Docker: https://www.docker.com/
- Docker Hub: https://hub.docker.com/

### 二、What's Docker

在 Docker 普及之前，将应用部署到不同环境往往是一件让人头疼的事。依赖缺失、库版本不一致、系统配置不同，都可能让原本正常运行的程序报错，于是便有了那句熟悉的话：“在我的机器上明明能用。”虚拟机虽然可以提供独立的运行环境，但每台虚拟机都需要运行完整的操作系统，资源占用和维护成本也随之增加。

![虚拟机与 Docker 架构对比](/images/docker.png)

Docker 通过容器化简化了这一过程：将应用代码、运行时和依赖打包成镜像，再通过镜像启动容器。开发、测试和生产环境可以使用同一份镜像，减少环境差异带来的问题，让应用从本地开发到服务器部署更加顺畅。

- **可移植性**：在兼容的系统与硬件平台上，同一份镜像可以用于本地机器、服务器和云端。
- **一致性**：复用相同的应用运行环境，减少“换个环境就出错”的情况。
- **轻量级**：容器共享宿主机内核，无需为每个应用运行一套完整的操作系统。
- **可扩展性**：可以通过增加容器实例扩展服务，并配合 Kubernetes 等编排工具管理多个容器。
- **高效率**：容器通常可以在几秒内启动，相比虚拟机占用更少的系统资源。

### 三、Install

Windows 和 macOS 可以通过 [Docker Desktop](https://www.docker.com/products/docker-desktop/) 安装和使用 Docker。Linux 的安装可以参考 [Docker Engine 官方安装文档](https://docs.docker.com/engine/install/)。macOS 还可以使用 [Lima](https://lima-vm.io/docs/examples/containers/docker/) 的 Docker 模板，通过一条命令创建并启动预装 Docker 的 Linux 虚拟环境。Lima 的安装与基础使用可以参考 [Lima](/2026/10/31/Lima/) 一文。

在 macOS 上使用 Docker Desktop 或 Lima 时，Linux 容器实际运行在 Linux 虚拟机中。下文的 Shell 示例使用 Bash 或 Zsh 语法，Windows 用户可以在 WSL 中执行；涉及 Linux 网络接口等主机操作时，需要在 Docker Engine 所在的 Linux 系统中执行。

#### 验证安装

安装完成并启动 Docker 服务后，可以通过下面四条命令检查客户端、服务端以及容器运行是否正常。Linux 下如果当前用户没有访问 Docker 服务的权限，连接服务端的命令需要加上 `sudo`。

查看 Docker 命令行客户端的版本。

```bash
docker --version
```

查看客户端和服务端各组件的版本信息。正常情况下会同时显示 `Client` 和 `Server` 两部分，可以用来确认客户端是否能够连接 Docker 服务。

```bash
docker version
```

查看 Docker 的运行环境和配置信息，包括容器与镜像数量、存储驱动、CPU、内存以及服务端操作系统等，方便了解当前连接的 Docker 环境。

```bash
docker info
```

创建并运行一个测试容器。如果本地没有 `hello-world` 镜像，Docker 会先从 Docker Hub 下载。看到 `Hello from Docker!`，说明测试容器已成功运行。

```bash
docker run --rm hello-world
```

其中，`--rm` 表示容器退出后自动删除该容器，下载的镜像会保留。

### 四、Image

Docker 镜像（Image）是创建容器的模板，包含运行应用所需的程序、依赖库和默认配置。镜像本身不会因为容器中的操作而改变：启动容器时，Docker 会在镜像之上增加一个属于该容器的可写层。同一份镜像可以创建多个容器，每个容器分别保存自己的修改。

镜像由多个只读层组成，不同镜像可以复用相同的层，因此拉取镜像时可能会看到某些层已经存在，无需重复下载。关于镜像与分层的概念，可以参考 [Docker 官方介绍](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/)。

#### 镜像名称

镜像通常通过下面的格式指定：

```text
仓库名[:标签]
```

省略标签时，Docker 默认使用 `latest`。

#### 搜索镜像

使用 `docker search` 搜索 Docker Hub 上的镜像。

```bash
docker search nginx
```

#### 拉取镜像

使用 `docker pull` 将镜像下载到本地。下面以 `nginx:stable` 为例，后续操作都使用这份镜像。

```bash
docker pull nginx:stable
```

拉取镜像只会下载镜像，不会启动容器。再次拉取相同标签时，Docker 会检查仓库中的镜像是否有更新，并复用本地已有的层。

#### 查看镜像

使用 `docker images` 查看本地镜像，也可以使用等价的 `docker image ls`。输出通常包含仓库名、标签、镜像 ID、创建时间和大小等信息。

```bash
docker images
```

使用 `docker image inspect` 查看镜像的详细信息，包括操作系统、处理器架构、环境变量和默认启动命令等。

```bash
docker image inspect nginx:stable
```

#### 镜像标签

使用 `docker tag` 为已有镜像增加一个名称和标签。下面的命令会让 `local-nginx:demo` 指向与 `nginx:stable` 相同的镜像，不会复制一份镜像内容。再次执行 `docker images` 时，可以看到两个名称对应相同的镜像 ID。

```bash
docker tag nginx:stable local-nginx:demo
```

#### 导出与导入

如果需要在机器之间离线传递镜像，可以使用 `docker save` 将镜像保存为 tar 文件。`-o` 用于指定输出文件。

```bash
docker save -o nginx-stable.tar nginx:stable
```

将文件复制到另一台运行 Docker 的机器后，使用 `docker load` 导入。`-i` 用于指定输入文件。

```bash
docker load -i nginx-stable.tar
```

#### 删除镜像

使用 `docker rmi` 删除本地镜像引用，也可以使用等价的 `docker image rm`。

先删除前面添加的 `local-nginx:demo` 标签。由于 `nginx:stable` 仍指向同一份镜像，这一步只会删除标签，不会删除镜像内容。

```bash
docker rmi local-nginx:demo
```

不再需要 Nginx 镜像时，再删除剩下的标签。如果没有其他标签或容器引用该镜像，Docker 会删除镜像及其不再被共享的层。

```bash
docker rmi nginx:stable
```

如果提示镜像被容器使用，需要先处理引用它的容器，包括已经停止的容器。容器的查看、停止和删除会在下一节介绍。

### 五、Container

容器（Container）是基于镜像创建的运行实例，包含应用进程、运行配置以及独立的可写层。镜像负责提供初始环境，容器负责实际运行应用。同一份镜像可以创建多个容器，每个容器都有自己的名称、状态和文件修改。

#### 创建并启动容器

使用 `docker run` 创建并启动一个新容器。`docker run` 每执行一次都会创建一个新容器，因此不能重复使用已经存在的容器名称。下面以 Nginx 为例，在后台启动一个名为 `nginx-demo` 的容器。

```bash
docker run -d --name nginx-demo -p 127.0.0.1:8080:80 nginx:stable
```

- `-d`：在后台运行容器，终端会输出容器 ID。
- `--name nginx-demo`：指定容器名称，后续可以使用名称或容器 ID 操作它。
- `-p 127.0.0.1:8080:80`：将 Docker 所在主机的本地 `8080` 端口映射到容器的 `80` 端口。
- `nginx:stable`：指定创建容器使用的镜像，本地不存在时会自动拉取。

如果 Docker 运行在本机，启动成功后，在浏览器访问 `http://localhost:8080`，就可以看到 Nginx 的欢迎页面。

#### 查看容器

使用 `docker ps` 查看正在运行的容器。

```bash
docker ps
```

添加 `-a` 可以查看所有容器，包括已经停止的容器；添加 `-q` 则只输出容器 ID。

```bash
docker ps -a
docker ps -aq
```

输出通常包含容器 ID、使用的镜像、启动命令、创建时间、状态、端口映射和名称。`STATUS` 中的 `Up` 表示正在运行，`Exited` 表示已经退出。参数说明可以参考 [官方文档](https://docs.docker.com/reference/cli/docker/container/ls/)。

#### 停止容器

使用 `docker stop` 停止正在运行的容器。Docker 会先发送停止信号，等待容器主进程退出；如果超过等待时间仍未退出，再强制终止。

```bash
docker stop nginx-demo
```

停止后可以通过 `docker ps -a` 找到该容器。这里创建容器时没有指定 `--rm`，因此停止不会删除容器，其配置和可写层中的文件修改仍会保留。

#### 启动已有容器

使用 `docker start` 启动已经停止的容器。它会复用原来的容器配置，不会创建新容器，也不会自动换用后来拉取的新镜像。

```bash
docker start nginx-demo
```

如果需要修改端口映射等创建时的配置，通常需要重新创建容器。

#### 重启容器

使用 `docker restart` 重启容器，常用于需要重新启动应用进程的场景。重启仍然使用原来的容器和配置。

```bash
docker restart nginx-demo
```

重启会中断容器中当前运行的进程，具体参数可以参考 [官方说明](https://docs.docker.com/reference/cli/docker/container/restart/)。

#### 查看容器详情

使用 `docker container inspect` 查看容器的详细信息，包括运行状态、环境变量、挂载目录、网络配置和端口映射等。

```bash
docker container inspect nginx-demo
```

输出默认为 JSON，也可以通过 `--format` 提取某个字段。例如，只查看容器状态：

```bash
docker container inspect --format '{{.State.Status}}' nginx-demo
```

格式化输出的用法可以参考 [官方说明](https://docs.docker.com/reference/cli/docker/container/inspect/)。

#### 删除容器

使用 `docker rm` 删除已经停止的容器。下面先停止 Nginx 容器，再将它删除。

```bash
docker stop nginx-demo
docker rm nginx-demo
```

如果只是运行一次性任务，可以在 `docker run` 中添加 `--rm`，让容器退出后自动删除，例如前面的 `hello-world` 验证命令。

`docker rm -f` 可以强制删除运行中的容器，会直接终止其进程；一般优先使用先停止、再删除的方式。删除参数可以参考 [官方说明](https://docs.docker.com/reference/cli/docker/container/rm/)。

### 六、Exec & Logs

容器启动后，可以通过 `docker exec` 在容器中执行命令，通过 `docker logs` 查看应用输出，方便检查配置和排查问题。下面沿用上一节的 `nginx-demo` 容器，需要确保它正在运行。

#### 进入容器

使用 `docker exec -it` 在正在运行的容器中启动一个交互式 Shell。

```bash
docker exec -it nginx-demo sh
```

- `-i`：保持标准输入打开，可以向容器中的进程输入命令。
- `-t`：分配一个伪终端，方便进行交互操作。
- `nginx-demo`：容器名称，也可以替换为容器 ID。
- `sh`：在容器中启动的 Shell；如果镜像中安装了 Bash，也可以换成 `bash`。

进入后执行的命令使用的是容器内部的环境。例如，查看 Nginx 配置目录：

```bash
ls /etc/nginx
```

操作完成后，输入 `exit` 或按 `Ctrl+D` 退出 Shell。这里退出的是 `docker exec` 新启动的 Shell，Nginx 主进程仍然运行，容器不会因此停止。

#### 执行容器内命令

如果只需要执行一次命令，可以直接在宿主机终端调用 `docker exec`，无需先进入交互式 Shell。例如，查看 Nginx 版本和检查配置是否正确：

```bash
docker exec nginx-demo nginx -v
docker exec nginx-demo nginx -t
```

这类命令通常不需要添加 `-it`，执行完成后会返回宿主机终端。

如果需要使用 `&&`、管道或重定向等 Shell 语法，需要显式调用容器中的 Shell。

```bash
docker exec nginx-demo sh -c 'pwd && ls /etc/nginx'
```

#### 查看容器日志

使用 `docker logs` 查看容器已经产生的日志。

```bash
docker logs nginx-demo
```

这里的日志主要来自容器主进程的标准输出（STDOUT）和标准错误（STDERR），不会自动包含应用写入任意文件中的日志。Nginx 官方镜像默认将访问日志和错误日志转发到标准输出与标准错误，因此可以直接通过该命令查看。

#### 实时跟踪日志

添加 `-f` 可以持续跟踪新产生的日志。结合 `--tail`，可以先显示最后若干行，再继续等待新日志。

```bash
docker logs --tail 100 -f nginx-demo
```

执行后，在浏览器访问 `http://localhost:8080`，就能在终端中看到新的访问日志。按 `Ctrl+C` 可以结束日志跟踪，容器会继续运行。

#### 筛选日志与显示时间

使用 `--tail` 限制显示的行数，避免一次输出过多历史日志。例如，只查看最后 50 行：

```bash
docker logs --tail 50 nginx-demo
```

使用 `--since` 筛选某个时间之后的日志，添加 `-t` 为每条日志显示 Docker 记录的时间戳。例如，查看最近 10 分钟的日志：

```bash
docker logs --since 10m -t nginx-demo
```

还可以结合 `--until` 限定结束时间。例如，查看 30 分钟前到 10 分钟前这一段时间的日志：

```bash
docker logs --since 30m --until 10m nginx-demo
```

这些参数可以组合使用。常见的排查方式是先查看最近的日志，再持续跟踪后续输出：

```bash
docker logs --since 10m --tail 100 -t -f nginx-demo
```

更多日志参数可以参考 [官方文档](https://docs.docker.com/reference/cli/docker/container/logs/)。

### 七、Volumes & Bind Mounts

默认情况下，容器中的文件修改保存在容器的**可写层**中。删除容器时，可写层也会一起被删除。如果希望数据在容器删除后仍然保留，或者让容器访问宿主机上的文件，就需要使用挂载。

#### 数据卷与目录挂载的区别

Docker 常用的持久化方式有数据卷（Volume）和绑定挂载（Bind Mount）。绑定挂载既可以挂载目录，也可以挂载单个文件。

| 对比项 | 数据卷（Volume） | 绑定挂载（Bind Mount） |
| --- | --- | --- |
| 数据位置 | 由 Docker 管理存储位置 | 使用宿主机上指定的文件或目录 |
| 指定方式 | 通常通过卷名指定 | 通过宿主机路径指定 |
| 常见用途 | 数据库文件、应用生成的数据 | 源代码、配置文件、静态资源 |
| 宿主机访问 | 通常通过容器或 Docker 工具访问 | 可以直接使用宿主机上的工具编辑 |
| 删除容器后 | 命名卷及其数据仍然保留 | 宿主机上的文件仍然保留 |

数据卷的生命周期独立于容器；绑定挂载则让容器直接访问已有的宿主机路径。

#### 创建数据卷

使用 `docker volume create` 创建一个名为 `demo-data` 的数据卷。

```bash
docker volume create demo-data
```

#### 查看数据卷

使用 `docker volume ls` 查看已有数据卷，使用 `docker volume inspect` 查看某个卷的详细信息。

```bash
docker volume ls
docker volume inspect demo-data
```

`inspect` 输出中的 `Mountpoint` 是卷在 Docker 所在主机上的存储位置。

#### 挂载数据卷

通过 `--mount` 将数据卷挂载到容器中的指定目录。下面启动一个临时容器，将一段文字写入 `/data/message.txt`，命令结束后自动删除容器。

```bash
docker run --rm \
  --mount type=volume,source=demo-data,target=/data \
  nginx:stable sh -c 'echo "Hello Docker" > /data/message.txt'
```

- `type=volume`：使用数据卷。
- `source=demo-data`：指定卷名；卷不存在时，Docker 会自动创建。
- `target=/data`：指定容器内的挂载目录，必须使用绝对路径。

此时 `/data/message.txt` 实际保存在 `demo-data` 卷中。再创建一个新容器，挂载同一个卷，就可以读取之前写入的内容：

```bash
docker run --rm \
  --mount type=volume,source=demo-data,target=/data,readonly \
  nginx:stable cat /data/message.txt
```

看到 `Hello Docker`，说明数据没有随着上一个容器的删除而消失。这里的 `readonly` 表示新容器只能读取该挂载中的数据，不能修改它。

也可以使用简写参数 `-v demo-data:/data` 挂载同一个命名卷。这里显式指定了卷名，因此 `--rm` 删除临时容器时不会删除该卷。

如果挂载时只指定容器内路径，不指定卷名，Docker 就会创建一个匿名卷，并自动为它生成随机名称。例如，`-v /data` 会创建一个匿名卷并挂载到容器的 `/data` 目录。

```bash
docker run --rm -v /data \
  nginx:stable sh -c 'echo "Hello Docker" > /data/message.txt'
```

匿名卷同样由 Docker 管理，可以通过 `docker volume ls` 查看。它与命名卷的主要区别是名称由 Docker 自动生成；每次按上面的方式创建新容器，都会创建新的匿名卷，不会自动复用之前的数据。

示例使用了 `--rm`，因此容器退出后，容器和本次创建的匿名卷都会自动删除。如果没有使用 `--rm`，普通的 `docker rm` 默认会保留匿名卷；需要一起删除时，可以使用 `docker rm -v 容器名`。这里的 `-v` 会删除容器关联的匿名卷，但不会删除命名卷。

#### 挂载宿主机目录

绑定挂载适合直接使用宿主机上的文件。下面以 Nginx 静态页面为例，在宿主机终端创建一个目录和首页文件：

```bash
mkdir -p docker-site
echo '<h1>Hello Docker</h1>' > docker-site/index.html
```

在同一目录下执行下面的命令，把 `docker-site` 挂载为 Nginx 的网页目录。示例使用 `8081` 端口，与前面的 `nginx-demo` 区分。

```bash
docker run -d --name nginx-bind \
  -p 127.0.0.1:8081:80 \
  --mount type=bind,source="$(pwd)/docker-site",target=/usr/share/nginx/html,readonly \
  nginx:stable
```

- `type=bind`：使用绑定挂载。
- `source`：宿主机上的目录，`$(pwd)` 会展开为当前工作目录。
- `target`：容器中的挂载路径，这里是 Nginx 默认的网页目录。
- `readonly`：容器只能读取该目录，宿主机仍然可以修改其中的文件。

如果 Docker 运行在本机，访问 `http://localhost:8081` 就可以看到自定义页面。在宿主机上修改 `docker-site/index.html` 后，刷新页面即可查看变化，无需重新构建镜像。

上面的目录挂载也可以简写为 `-v "$(pwd)/docker-site:/usr/share/nginx/html:ro"`。`ro` 表示只读，省略时默认允许容器写入。

#### 查看挂载信息

使用 `docker container inspect` 查看容器配置，在 `Mounts` 字段中可以找到挂载类型、源位置、容器内路径以及是否可写等信息。

```bash
docker container inspect nginx-bind
```

也可以只输出挂载信息：

```bash
docker container inspect --format '{{json .Mounts}}' nginx-bind
```

其中，`Type` 为 `volume` 或 `bind`，`Destination` 是容器内路径，`RW` 为 `false` 表示只读。

#### 删除数据卷

如果不再需要前面的测试数据卷，可以使用 `docker volume rm` 删除。

```bash
docker volume rm demo-data
```

删除卷会删除其中保存的数据，执行前需要确认内容已经不再需要。被容器引用的卷无法直接删除，即使引用它的容器已经停止，也需要先删除对应容器。

#### 注意事项

- 绑定挂载会遮住容器目标路径原有的内容，不会自动将这些内容复制到宿主机目录。例如，上面的 Nginx 目录挂载会让容器看到自己创建的首页，而不是镜像自带的欢迎页面。

- 数据卷的行为有所不同：将一个空卷挂载到容器中已有内容的目录时，Docker 默认会先将该目录中的内容复制到卷中；如果卷已经有数据，则使用卷中已有的内容。

- 使用 `--mount type=bind` 时，源路径默认必须已经存在；使用 `-v` 时，如果源路径不存在，Docker 会尝试创建一个目录。因此，挂载单个文件时应先确认文件存在，避免意外挂载成目录。

### 八、Network

Docker 网络用于管理容器之间，以及容器与宿主机、外部服务之间的通信。下面以 Linux 容器为例，介绍常用的网络类型和操作。

#### 常见网络类型

| 类型 | 说明 | 常见用途 |
| --- | --- | --- |
| `bridge` | 为容器提供独立的网络环境，通过网桥连接容器 | 单台 Docker 主机上的应用通信 |
| `host` | 使用 Docker 所在主机的网络环境，不分配独立的容器 IP | 需要共享主机网络的场景 |
| `none` | 只保留容器内部的回环网络接口 | 不需要对外网络连接的任务 |

#### docker0

在 Linux 上使用 Docker Engine 的默认配置时，Docker 启动后会自动创建名为 `bridge` 的默认网络，并在主机上创建一个名为 `docker0` 的虚拟网桥。`bridge` 是 Docker 中的网络名称。

执行 `docker run` 时，如果没有指定 `--network`，容器通常会加入默认的 `bridge` 网络，相当于指定 `--network bridge`，而不是 `--network docker0`。

容器的虚拟网卡通过虚拟以太网接口对（veth pair）连接到 `docker0`，让同一网络内的容器可以相互通信。在默认配置下，容器还可以通过主机的 NAT 转换访问外部网络。

可以通过下面的命令查看默认网络的子网、网关和已连接的容器：

```bash
docker network inspect bridge
```

默认配置中常见的子网是 `172.17.0.0/16`，网关地址是 `172.17.0.1`，但实际地址可能因配置或地址分配而不同，应以查看结果为准。

在 Docker 所在的 Linux 主机上，还可以查看 `docker0` 接口：

```bash
ip addr show docker0
```

默认 `bridge` 网络中的容器通常可以通过 IP 地址相互访问，但不提供容器名称的自动 DNS 解析。

#### 创建网络

使用 `docker network create` 创建自定义网络。下面创建一个名为 `app-net` 的 `bridge` 网络。

```bash
docker network create --driver bridge app-net
```

如果省略 `--driver bridge`，默认也会创建 `bridge` 网络。这类网络用于同一台 Docker 主机上的容器通信。

#### 查看网络

使用 `docker network ls` 查看当前已有的网络，输出通常包含网络 ID、名称、驱动和作用域。

```bash
docker network ls
```

使用 `docker network inspect` 查看某个网络的详细信息，包括子网、网关以及连接到该网络的容器等。

```bash
docker network inspect app-net
```

#### 创建容器时指定网络

通过 `--network` 指定容器加入的网络。下面在 `app-net` 中启动一个名为 `nginx-net` 的 Nginx 容器，并将网页服务映射到本地 `8082` 端口。

```bash
docker run -d --name nginx-net \
  --network app-net \
  -p 127.0.0.1:8082:80 \
  nginx:stable
```

如果 Docker 运行在本机，可以在浏览器访问 `http://localhost:8082`。这里的 `8082` 是主机端口，Nginx 在容器中仍然监听 `80` 端口。

容器创建后，也可以从容器侧查看它连接的网络：

```bash
docker container inspect --format '{{json .NetworkSettings.Networks}}' nginx-net
```

#### 容器间通信

同一个自定义 `bridge` 网络中的容器，可以使用容器名称访问彼此的服务。下面启动一个临时的 BusyBox 容器，加入 `app-net`，再请求 Nginx 的首页：

```bash
docker run --rm --network app-net \
  busybox:1.37 wget -qO- http://nginx-net:80
```

其中，`nginx-net` 会被 Docker 的内置 DNS 解析为该容器在网络中的 IP 地址，`wget -qO-` 会把响应内容输出到终端。看到 Nginx 欢迎页面的 HTML，说明容器之间已经可以通信。

容器间访问使用的是目标容器的服务端口，因此这里使用 `80`，不需要绕到主机的 `8082` 端口。`-p` 用于将服务发布到主机；即使没有配置 `-p`，同一自定义网络中的容器通常仍然可以访问彼此监听的端口。

#### 连接已有容器

已有容器也可以通过 `docker network connect` 加入网络，无需重新创建。先创建一个用于测试的容器，让它通过 `sleep` 保持运行：

```bash
docker run -d --name net-client busybox:1.37 sleep 3600
```

这个容器最初使用默认网络。接着将它连接到 `app-net`，再执行请求：

```bash
docker network connect app-net net-client
docker exec net-client wget -qO- http://nginx-net:80
```

一个容器可以连接多个网络。这里连接 `app-net` 不会自动断开它原来的网络。还可以通过 `docker network connect --alias 别名 网络名 容器名` 为新连接设置网络别名，具体用法可以参考 [官方说明](https://docs.docker.com/reference/cli/docker/network/connect/)。

#### 断开网络

使用 `docker network disconnect` 将正在运行的容器从指定网络中断开。

```bash
docker network disconnect app-net net-client
```

这条命令不会删除容器，也不会断开它与其他网络的连接，但会中断依赖 `app-net` 的通信。此后，`net-client` 不能再通过该网络解析并访问 `nginx-net`。

#### 删除网络

不再需要自定义网络时，可以使用 `docker network rm` 删除。执行前需要先断开或删除仍然连接到该网络的容器。

前面的 `net-client` 已经断开，下面再断开 `nginx-net`，然后删除网络：

```bash
docker network disconnect app-net nginx-net
docker network rm app-net
```

删除网络不会删除容器或镜像，但容器将失去通过该网络进行通信的能力。默认的 `bridge`、`host` 和 `none` 网络不能按普通自定义网络删除。删除命令可以参考 [官方文档](https://docs.docker.com/reference/cli/docker/network/rm/)。

### 九、Dockerfile

Dockerfile 是一个描述镜像构建步骤的文本文件，通常命名为 `Dockerfile`，不带扩展名。通过它可以指定基础镜像、复制应用文件、安装依赖，并设置容器启动时执行的命令，让构建过程可以重复执行。

Dockerfile 用来构建镜像，镜像再用来创建容器。修改 Dockerfile 或项目文件后，需要重新构建镜像，并用新镜像重新创建容器，已有容器不会自动更新。

#### 常用指令

| 指令 | 作用 |
| --- | --- |
| `FROM` | 指定基础镜像，也可以用于开始新的构建阶段 |
| `WORKDIR` | 设置后续指令使用的工作目录，目录不存在时会创建 |
| `COPY` | 将构建上下文中的文件复制到镜像中 |
| `ADD` | 复制文件，并支持本地 tar 自动解包等额外功能；普通文件复制通常使用 `COPY` |
| `RUN` | 在构建镜像时执行命令，例如安装依赖 |
| `ENV` | 设置镜像中的环境变量，容器运行时也可以使用 |
| `ARG` | 定义构建参数，可以通过 `--build-arg` 传入，不会自动成为容器运行时的环境变量 |
| `EXPOSE` | 声明应用使用的端口，不会自动发布到宿主机 |
| `CMD` | 设置容器的默认启动命令，或为 `ENTRYPOINT` 提供默认参数 |
| `ENTRYPOINT` | 设置容器启动时执行的入口程序 |
| `USER` | 设置后续构建步骤及容器运行时使用的用户 |

`RUN` 在构建时执行，`CMD` 和 `ENTRYPOINT` 在容器启动时生效。一个构建阶段中如果写了多个 `CMD`，只有最后一个生效。完整语法可以参考 [Dockerfile 官方文档](https://docs.docker.com/reference/dockerfile/)。

#### 编写 Dockerfile

下面以自定义 Nginx 首页为例，把网页文件直接放入镜像，而不是通过目录挂载提供。先创建一个独立的示例目录，并准备首页文件：

```bash
mkdir -p dockerfile-demo
cd dockerfile-demo
echo '<h1>Hello Dockerfile</h1>' > index.html
```

在该目录中创建名为 `Dockerfile` 的文件，写入下面的内容：

```dockerfile
FROM nginx:stable

WORKDIR /usr/share/nginx/html
COPY index.html ./index.html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- `FROM nginx:stable`：在 Nginx 官方镜像的基础上构建。
- `WORKDIR /usr/share/nginx/html`：将工作目录设为 Nginx 默认的网页目录。
- `COPY index.html ./index.html`：将当前构建上下文中的首页文件复制到镜像的工作目录中，替换原来的首页。
- `EXPOSE 80`：声明 Nginx 使用容器内的 `80` 端口，访问时仍需要通过 `-p` 发布端口。
- `CMD`：默认以前台方式运行 Nginx。`daemon off;` 让 Nginx 保持在前台，避免主进程退出导致容器停止。

#### 构建镜像

在 `dockerfile-demo` 目录中执行 `docker build`：

```bash
docker build -t my-nginx:1.0 .
```

- `-t my-nginx:1.0`：设置生成镜像的名称和标签。
- `.`：将当前目录作为构建上下文，构建器可以读取其中未被忽略的文件。

默认情况下，Docker 会读取构建上下文根目录中的 `Dockerfile`。如果文件使用其他名称，可以通过 `-f` 指定，例如：

```bash
docker build -f Dockerfile.dev -t my-nginx:dev .
```

#### 默认命令与入口程序

在 `docker run` 的镜像名后面传入命令，可以替换镜像中的 `CMD`。例如，临时查看镜像中的 Nginx 版本，执行完后自动删除容器：

```bash
docker run --rm my-nginx:1.0 nginx -v
```

如果镜像还设置了 `ENTRYPOINT`，镜像名后的内容会作为参数传给入口程序，而不是直接替换入口程序。本例继承了 Nginx 官方镜像的入口脚本，该脚本会执行传入的命令，因此可以这样运行 `nginx -v`。需要替换入口程序时，可以使用 `docker run --entrypoint`。

#### 构建上下文与忽略文件

`COPY` 的源路径相对于构建上下文，而不是相对于 Dockerfile 所在的目录。因此，构建前需要确认要复制的文件位于上下文中，不能依靠 `COPY ../文件` 访问上下文之外的文件。

在构建上下文根目录中创建 `.dockerignore`，可以排除无关文件，减少构建需要处理的内容。例如：

```text
.git
node_modules
*.log
.env
.env.*
```

匹配这些规则的文件不会进入构建上下文，也不能被普通的 `COPY` 指令复制。不要将构建需要的文件加入忽略规则。上下文和忽略文件的用法可以参考 [官方文档](https://docs.docker.com/build/concepts/context/)。

#### 构建缓存

Docker 会尝试复用之前的构建结果，避免每次都从头执行。某条指令或它依赖的文件发生变化时，相关步骤及后续依赖步骤通常需要重新构建。

因此，可以将变化较少的步骤放在前面，变化频繁的应用代码放在后面。例如，先复制依赖清单并安装依赖，再复制应用代码，这样只修改代码时就有机会复用安装依赖的缓存。规则可以参考 [官方说明](https://docs.docker.com/build/cache/invalidation/)。

如果需要跳过构建步骤的缓存，可以添加 `--no-cache`：

```bash
docker build --no-cache -t my-nginx:1.0 .
```

`--no-cache` 不等于更新基础镜像。希望同时检查并拉取较新的基础镜像时，可以结合 `--pull`：

```bash
docker build --pull --no-cache -t my-nginx:1.0 .
```

### 十、Compose

Docker Compose 可以通过一个 YAML 文件定义服务、网络和数据卷，再通过命令统一创建和管理容器。相比逐条编写 `docker run`，它可以把运行配置保存在文件中，方便重复使用和分享。

下面使用 `docker compose` 命令，以 Nginx 网页服务和 Redis 服务为例。使用前可以执行 `docker compose version`，确认 Compose 已经安装。

#### 编写配置文件

先创建独立的项目目录，并准备 Nginx 首页文件：

```bash
mkdir -p compose-demo/html
cd compose-demo
echo '<h1>Hello Compose</h1>' > html/index.html
```

在 `compose-demo` 目录中创建 `compose.yaml`：

```yaml
name: compose-demo

services:
  web:
    image: nginx:stable
    ports:
      - "127.0.0.1:8084:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

- `name`：项目名称，Compose 会据此为容器、网络和数据卷生成名称。
- `services`：定义服务，这里包含 `web` 和 `redis`。
- `image`：指定服务使用的镜像。
- `ports`：发布端口，这里将 Nginx 的 `80` 端口映射到本地 `8084` 端口。
- 服务中的 `volumes`：配置该服务的挂载关系，`web` 将宿主机的 `./html` 挂载到网页目录，`redis` 将 `redis-data` 卷挂载到 `/data`。
- `command`：覆盖镜像默认命令，这里让 Redis 启用 AOF 持久化。
- `restart: unless-stopped`：自动重启策略；手动停止的容器不会因此自动重新启动。
- 顶层 `volumes`：声明项目使用的命名卷，这里是 `redis-data`；声明本身不会将卷挂载到所有服务，仍需在服务中指定。

YAML 使用空格缩进，不要使用 Tab。`./html` 相对于配置文件所在目录。现代 Compose 文件不需要添加顶层 `version` 字段，服务配置可以参考 [官方文档](https://docs.docker.com/reference/compose-file/services/)。

#### 检查配置

后续命令都在 `compose-demo` 目录中执行。使用 `docker compose config` 检查并输出解析后的配置，帮助发现缩进错误、无效字段或变量替换问题。

```bash
docker compose config
```

如果配置文件使用其他名称，或者需要从其他目录执行，可以通过 `-f` 指定文件，并在后续命令中继续使用同一个配置文件。

```bash
docker compose -f compose.yaml config
```

#### 启动服务

使用 `docker compose up -d` 创建并在后台启动服务，需要的镜像在本地不存在时会自动拉取。

```bash
docker compose up -d
```

如果 Docker 运行在本机，等待服务就绪后访问 `http://localhost:8084`，可以看到 `Hello Compose` 页面。还可以检查 Redis 是否正常响应：

```bash
docker compose exec redis redis-cli ping
```

返回 `PONG`，说明 Redis 可以正常处理请求。

Compose 默认会为项目创建一个自定义网络，本例通常名为 `compose-demo_default`。同一网络中的服务可以通过服务名访问彼此，例如 Redis 的地址是 `redis:6379`。Redis 没有配置 `ports`，因此不会通过本例配置向主机发布 `6379` 端口，但同一网络中的容器仍然可以访问它。规则可以参考 [Compose 网络说明](https://docs.docker.com/compose/how-tos/networking/)。

#### 查看服务状态

使用 `docker compose ps` 查看当前项目正在运行的服务容器，添加 `-a` 可以包含已经停止的容器。

```bash
docker compose ps
docker compose ps -a
```

Compose 命令通常通过配置中的服务名操作容器，例如 `web`、`redis`，不需要手动填写生成的容器名称。

#### 查看服务日志

使用 `docker compose logs` 查看各服务的日志，也可以指定某个服务。结合 `--tail` 和 `-f`，可以限制历史日志行数并持续跟踪新日志。

```bash
docker compose logs
docker compose logs web
docker compose logs --tail 100 -f web
```

按 `Ctrl+C` 结束日志跟踪不会停止服务。如果使用不带 `-d` 的 `docker compose up` 在前台运行，按 `Ctrl+C` 则会停止它管理的服务容器。

#### 进入服务容器

使用 `docker compose exec` 在已经运行的服务容器中执行命令。例如，进入 Nginx 服务的 Shell：

```bash
docker compose exec web sh
```

Compose 的 `exec` 默认提供交互终端，通常无需额外添加 `-it`。输入 `exit` 可以退出 Shell，服务主进程仍然运行。也可以直接执行一次性检查命令：

```bash
docker compose exec web nginx -t
```

命令用法可以参考 [官方说明](https://docs.docker.com/reference/cli/docker/compose/exec/)。

#### 停止服务

使用 `docker compose stop` 停止服务，保留容器、网络和数据卷。也可以在命令后指定服务名，只停止其中一个服务。

```bash
docker compose stop
```

#### 启动已有服务

使用 `docker compose start` 启动之前停止的服务容器。它不会创建缺失的容器，也不会应用新的配置；第一次启动项目或修改配置后，应该使用 `docker compose up -d`。

```bash
docker compose start
```

#### 重启服务

使用 `docker compose restart` 重启服务。下面只重启 `web`，其他服务保持运行。

```bash
docker compose restart web
```

`restart` 不会重新构建镜像，也不会应用 `compose.yaml` 中修改后的端口、环境变量等配置。

#### 更新镜像与配置

更新镜像时，可以先拉取配置中指定的镜像，再运行 `up`，让 Compose 根据变化重新创建需要更新的容器。

```bash
docker compose pull
docker compose up -d
```

只修改服务配置时，也可以直接执行 `docker compose up -d`。重新创建容器会替换容器可写层，但会保留挂载的数据卷。`pull` 本身只下载镜像，不会替换运行中的容器。

如果服务通过 `build` 配置从 Dockerfile 构建镜像，可以使用 `docker compose up -d --build` 先构建再启动；本例使用现成的 `image`，不需要这个参数。更新行为可以参考 [官方说明](https://docs.docker.com/reference/cli/docker/compose/up/)。

#### 关闭项目与保留数据

使用 `docker compose down` 停止并删除项目中的服务容器及由 Compose 管理的网络。

```bash
docker compose down
```

默认情况下，镜像和命名卷会保留。本例中的 Redis 数据卷通常名为 `compose-demo_redis-data`，重新执行 `docker compose up -d` 时，可以继续挂载该卷。宿主机上的 `html` 目录也不会被删除。

如果确定不再需要项目中的数据，可以添加 `-v`，同时删除配置中声明的命名卷及容器关联的匿名卷。

```bash
docker compose down -v
```

这会删除本例 Redis 数据卷中的数据。配置为 `external` 的网络和数据卷不会被 `down` 删除，即使使用 `-v` 也一样。普通 `down` 虽然会保留匿名卷，但后续 `up` 不会自动重新挂载原来的匿名卷，因此需要持久保存的数据通常使用命名卷或绑定挂载。删除范围可以参考 [官方说明](https://docs.docker.com/reference/cli/docker/compose/down/)。

### 十一、参考资料

- geeksforgeeks: https://www.geeksforgeeks.org/
