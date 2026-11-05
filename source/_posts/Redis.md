---
title: Redis
date: 2026-11-05 19:18:03
category:
  - redis
tags:
  - redis
---

Redis（Remote Dictionary Service），远程字典服务。是一个开源的使用 ANSI C 语言编写、支持网络、可基于内存亦可持久化的 Key-Value 数据库，支持字符串、哈希、列表、集合和有序集合等多种数据类型，常用于缓存、会话管理、计数器和排行榜等场景。本文记录 Redis 的基础概念、常用命令及基本使用方法，供个人学习和查阅。

### 一、redis 官网

- 官网：https://redis.io/

### 二、redis 安装

以在 Ubunut-22.04 上安装 redis 为例：
```bash
sudo apt update  # 获取更新列表
sudo apt install redis-server -y

redis-server --version  # 查看 redis 版本

sudo systemctl start redis-server   # 启动 redis
sudo systemctl enable redis-server  # 设置开机自启
sudo systemctl status redis-server  # 查看运行状态，正常情况下会看到 activate

redis-cli        # 进入 redis cli
127.0.0.1:6379>  # 成功连接

127.0.0.1:6379>ping  # 测试连接
pong                 # 连接成功
```

### 三、redis 基础知识

#### redis 是单线程的

Redis 是单线程的，主要指**一个 Redis 实例中的常规命令由主线程串行执行**。多个客户端同时发送 `SET`、`GET` 等命令时，主线程会依次执行这些命令。

单线程仍然能高效处理大量请求，主要有以下几个原因：

- **基于内存操作**：数据读写主要在内存中完成，减少了访问磁盘的开销。
- **I/O 多路复用**：通过事件循环监听多个客户端连接，在连接就绪时处理相应事件，不需要为每个连接创建一个线程。

#### redis 默认端口号来源

Redis 默认使用 **6379** 端口。这个数字的来历与开发者的偶像意大利艺人 **Alessia Merz** 有关：将其姓氏 `MERZ` 按电话九宫格键盘映射为数字，得到的就是 `6379`：

### 四、redis 通用命令

通过 `redis-cli` 进入 redis 命令行终端即可执行 redis 相关命令。

#### redis db 命令

##### `select`

redis 默认有 16 个数据库，通过 `select` 指令切换数据库。
```redis
select 1  # 切换到编号为 1 的数据库
```

##### `flush`

清空 redis 数据库。
```redis
flushdb   # 清空当前数据库
flushall  # 清空所有数据库 
```

#### redis key 命令

##### `keys`

模糊匹配，搜索满足要求的 key。不建议使用，数据量大时会阻塞 redis 线程。
```redis
keys *     # 匹配所有 key
keys ?ov?  # ? 匹配任意一个字符，* 匹配任意长度的字符
```

##### `exists`

查看指定 key 是否存在。
```redis
exists key
```

##### `type`

查看指定 key 存储的数据类型。
```redis
type key
```

##### `expire`

给指定 key 设置过期时间。
```redis
expire key number  # number 为过期时间，单位为秒
```

##### `ttl`

查看指定 key 的过期时间。
- `-1`：过期时间为永久
- `-2`：key 不存在或已经过期
```redis
ttl key
```

### 五、redis 常见数据结构

Redis 使用 Key-Value 的形式存储数据，key 使用字符串，value 可以选择不同的数据类型。本节介绍最常用的五种基本类型。

| 类型 | 特点 | 使用场景 |
| --- | --- | --- |
| String | 保存文本、数字或序列化后的数据 | 缓存、计数器、会话信息 |
| Hash | 在一个 key 下保存多个 field-value | 用户信息、商品属性、购物车 |
| List | 元素有序、允许重复，支持两端插入和弹出 | 简单任务队列、最新消息列表 |
| Set | 元素唯一，不保证顺序 | 标签去重、共同关注、成员判断 |
| Sorted Set | 元素唯一，按 score 排序 | 排行榜、按时间或分数范围查询 |

以下示例假设使用的 `demo:` key 初始不存在，并按文中顺序执行。`>>>` 表示返回结果，不属于输入命令；数组结果用 `[...]` 简写。集合的输出顺序仅作示意，实际顺序可能不同。

#### `String`

String 是最基本的数据类型，可以保存文本、数字和二进制数据。JSON 等结构化数据也可以序列化成字符串后保存。

##### `set`、`get`

设置和读取字符串。`SET` 默认覆盖已有值；`EX` 指定过期时间，单位为秒；`NX` 表示仅在 key 不存在时设置。

```redis
SET demo:name "nagi"
>>> OK
GET demo:name
>>> "nagi"

SET demo:token "abc123" EX 60  # 写入字符串，60 秒后过期
>>> OK
# 等价写法：SETEX demo:token 60 "abc123"
TTL demo:token
>>> 60  # 示例值，实际返回剩余秒数

SET demo:name "other" NX  # 仅在 key 不存在时写入
>>> (nil)
# 也可使用 SETNX demo:name "other"，key 已存在时返回 0
GET demo:name
>>> "nagi"
```

##### `mset`、`mget`

批量设置和读取多个 key。`MGET` 的返回顺序与传入的 key 顺序一致。

```redis
MSET demo:city "Shanghai" demo:language "Chinese"
>>> OK
MGET demo:city demo:language
>>> ["Shanghai", "Chinese"]
```

##### `incr`、`incrby`、`decr`

对整数值进行原子增减，常用于访问次数等计数场景。key 不存在时，以 `0` 为初始值；已有值不是合法整数时会报错。

```redis
SET demo:views 0
>>> OK
INCR demo:views  # 原子加 1
>>> 1
INCRBY demo:views 5  # 在当前值上加 5
>>> 6
DECR demo:views  # 原子减 1
>>> 5
```

如果需要进行浮点数增量运算时，可以使用 `INCRBYFLOAT`。

#### Hash

Hash 在一个 key 下保存多组 field-value，适合表示用户、商品等对象。与保存整个 JSON 字符串相比，它可以直接读写指定字段。

##### `hset`、`hget`、`hmget`、`hgetall`

设置字段、读取单个或多个字段，以及读取所有字段和值。`HSET` 可以添加新字段，也可以更新已有字段。

```redis
HSET demo:user:1 name "nagi" age 20 city "Shanghai"  # 一次设置三个字段
>>> 3
HGET demo:user:1 name
>>> "nagi"
HMGET demo:user:1 name age
>>> ["nagi", "20"]
HGETALL demo:user:1
>>> ["name", "nagi", "age", "20", "city", "Shanghai"]

HSET demo:user:1 city "Beijing"  # 更新已有字段
>>> 0  # 没有新增字段，更新仍然成功
```

`HSET` 返回新增字段的数量，因此首次新增三个字段时返回 `3`，更新已有的 `city` 字段时返回 `0`。`HGETALL` 返回交替排列的字段和值，字段的返回顺序不作保证。

##### `hexists`、`hlen`、`hdel`、`hincrby`

检查字段是否存在、统计字段数量、删除字段，以及对整数形式的字段值进行增量更新。

```redis
HEXISTS demo:user:1 name
>>> 1
HLEN demo:user:1  # 统计字段数量
>>> 3
HDEL demo:user:1 city
>>> 1
HINCRBY demo:user:1 age 1  # 只对 age 字段加 1
>>> 21
HGET demo:user:1 age
>>> "21"
```

#### List

List 保存按位置排列的字符串，允许出现重复元素。可以从左端或右端插入、弹出元素，也可以按索引读取。底层实现是「双向循环链表」。

##### `lpush`、`rpush`

从左端或右端插入元素。`LPUSH` 一次传入多个元素时，会依次将它们插入左端，因此这些元素最终的排列顺序与参数顺序相反。

```redis
RPUSH demo:tasks "task1" "task2"  # 从右端依次插入
>>> 2
LPUSH demo:tasks "task0"  # 插入左端，成为第一个元素
>>> 3
```

此时列表从左到右为 `task0`、`task1`、`task2`。

##### `lrange`、`lindex`、`llen`

读取指定范围、指定索引处的元素，以及列表长度。索引从 `0` 开始，`-1` 表示最后一个元素；`LRANGE` 包含起始和结束位置。

```redis
LRANGE demo:tasks 0 -1  # 读取整个列表，-1 表示最后一个元素
>>> ["task0", "task1", "task2"]
LRANGE demo:tasks 0 1  # 读取前两个元素，包含结束索引 1
>>> ["task0", "task1"]
LINDEX demo:tasks 0
>>> "task0"
LLEN demo:tasks
>>> 3
```

##### `lpop`、`rpop`、`blpop`

从左端或右端取出并删除元素。普通弹出命令在列表为空时返回空值；`BLPOP` 可以等待元素出现，阻塞弹出，下面的 `5` 表示最多等待 5 秒。

```redis
LPOP demo:tasks  # 取出并删除最左侧元素
>>> "task0"
RPOP demo:tasks  # 取出并删除最右侧元素
>>> "task2"
LPOP demo:tasks
>>> "task1"
BLPOP demo:tasks 5  # 列表为空时最多等待 5 秒
>>> (nil)  # 列表为空，等待 5 秒后超时
```

使用 `RPUSH` 入队、`LPOP` 出队，可以实现先进先出的简单队列；使用 `LPUSH` 入栈、`LPOP` 出栈，可以实现后进先出的栈。

#### Set

Set 保存不重复的字符串，不保证元素的返回顺序。适合去重、成员判断，以及交集、并集和差集运算。

##### `sadd`、`smembers`、`sismember`、`scard`

添加元素、读取全部成员、判断成员是否存在，以及统计成员数量。重复添加同一个成员不会增加集合大小。

```redis
SADD demo:tags "redis" "linux" "redis"  # 重复成员只保存一份
>>> 2
SMEMBERS demo:tags
>>> ["redis", "linux"]
SISMEMBER demo:tags "redis"
>>> 1
SCARD demo:tags
>>> 2
```

##### `srem`、`spop`

`SREM` 删除指定成员，`SPOP` 随机取出并删除一个成员。

```redis
SREM demo:tags "linux"
>>> 1
SPOP demo:tags  # 随机取出并删除，此时集合只剩 redis
>>> "redis"
```

##### `sinter`、`sunion`、`sdiff`

分别计算交集、并集和差集。差集的方向与参数顺序有关。

```redis
SADD demo:tags:a "redis" "linux"
>>> 2
SADD demo:tags:b "redis" "git"
>>> 2

SINTER demo:tags:a demo:tags:b  # 交集：两个集合共有的成员
>>> ["redis"]
SUNION demo:tags:a demo:tags:b  # 并集：合并成员并去重
>>> ["redis", "linux", "git"]
SDIFF demo:tags:a demo:tags:b  # 差集：a 中存在、b 中不存在的成员
>>> ["linux"]
```

这些命令不会修改原集合，结果也不保证返回顺序。

#### Sorted Set

Sorted Set 通常简称 ZSet。每个成员关联一个数值分数 `score`，默认按分数从小到大排序。成员不能重复，但分数可以相同；分数相同时，按成员的字典序排列。当数据量较大时底层实现是「哈希表 + 跳表」。

##### `zadd`、`zscore`、`zcard`

添加成员、读取成员分数，以及统计成员数量。`ZADD` 的参数顺序是 `score member`；再次添加已有成员时会更新其分数。

```redis
# 每组参数依次为 score、member
ZADD demo:ranking 90 "alice" 95 "bob" 100 "carol"
>>> 3
ZSCORE demo:ranking "bob"
>>> "95"
ZCARD demo:ranking
>>> 3
```

##### `zrange`、`zrank`、`zrevrank`

按排名读取成员，以及查询某个成员的排名。排名从 `0` 开始，`ZRANK` 按分数升序计算，`ZREVRANK` 按分数降序计算；`WITHSCORES` 表示同时返回分数。

```redis
ZRANGE demo:ranking 0 -1 WITHSCORES  # 按分数升序返回全部成员及分数
>>> ["alice", "90", "bob", "95", "carol", "100"]
ZRANK demo:ranking "bob"  # 升序排名，从 0 开始
>>> 1
ZREVRANK demo:ranking "carol"  # 降序排名，最高分排第 0 位
>>> 0
```

Redis 6.2 及以上版本还可以通过 `REV` 倒序读取，通过 `BYSCORE` 按分数范围读取：

```redis
ZRANGE demo:ranking 0 1 REV WITHSCORES  # 取分数最高的两名
>>> ["carol", "100", "bob", "95"]
ZRANGE demo:ranking 90 95 BYSCORE WITHSCORES  # 按分数范围查询，包含边界
>>> ["alice", "90", "bob", "95"]
```

##### `zincrby`、`zrem`

增加成员分数，或者删除指定成员。

```redis
ZINCRBY demo:ranking 10 "alice"  # 给 alice 的分数加 10
>>> "100"
ZSCORE demo:ranking "alice"
>>> "100"
ZREM demo:ranking "bob"
>>> 1
```

### 六、redis 特殊数据结构

除了前面的五种常见类型，Redis 还提供 Bitmap、HyperLogLog 和 GEO 等功能。它们复用了已有的数据类型：Bitmap 和 HyperLogLog 基于 String，GEO 基于 Sorted Set。

| 结构 | 特点 | 使用场景 |
| --- | --- | --- |
| Bitmap | 用一个二进制位表示一种状态，支持位运算 | 用户签到、在线状态、活跃用户统计 |
| HyperLogLog | 使用较少内存估算不重复元素的数量 | 网站 UV、独立搜索词数量统计 |
| GEO | 保存经纬度，支持距离计算和范围查询 | 附近门店、附近用户、位置检索 |

#### Bitmap

[Bitmap](https://redis.io/docs/latest/develop/data-types/bitmaps/) 是对 String 进行按位操作的一组命令，每个位只能保存 `0` 或 `1`。可以将位偏移量映射为日期或用户编号，用来记录是否签到、是否活跃等状态。

例如，记录一个用户某月的签到情况，使用偏移量 `0` 表示第 1 天、`1` 表示第 2 天，以此类推。31 天的状态只需要 31 个二进制位，即 4 字节的数据空间，不包含 key 和对象等额外开销。

##### `setbit`、`getbit`

设置或读取指定偏移量上的值。偏移量从 `0` 开始；`SETBIT` 返回修改前的位值，未设置的位读取为 `0`。

```redis
SETBIT demo:sign:user:1 0 1  # 偏移量 0 对应第 1 天，1 表示已签到
>>> 0  # 返回修改前的位值
SETBIT demo:sign:user:1 1 1  # 标记第 2 天已签到
>>> 0

GETBIT demo:sign:user:1 1
>>> 1
GETBIT demo:sign:user:1 2  # 查看第 3 天是否签到
>>> 0
```

##### `bitcount`

统计值为 `1` 的位的数量，下面的结果表示该用户已经签到两天。

```redis
BITCOUNT demo:sign:user:1  # 统计已签到的天数
>>> 2
```

##### `bitop`

对多个位图进行位运算，并将结果保存到目标 key。下面用用户编号作为偏移量，记录两天的活跃用户：第 1 天有用户 `1`、`3`，第 2 天有用户 `3`、`5`。

```redis
SETBIT demo:active:day1 1 1  # 偏移量代表用户编号，标记用户 1 当天活跃
>>> 0
SETBIT demo:active:day1 3 1
>>> 0
SETBIT demo:active:day2 3 1
>>> 0
SETBIT demo:active:day2 5 1
>>> 0

BITOP AND demo:active:both demo:active:day1 demo:active:day2  # 两天均活跃
>>> 1  # 结果占 1 字节，不是人数
BITCOUNT demo:active:both  # 统计两天均活跃的人数
>>> 1

BITOP OR demo:active:either demo:active:day1 demo:active:day2  # 任意一天活跃
>>> 1
BITCOUNT demo:active:either
>>> 3
```

`AND` 得到两天都活跃的用户，`OR` 得到任意一天活跃的用户。注意，`BITOP` 返回的是结果字符串的字节数，人数需要通过 `BITCOUNT` 获取。

Bitmap 的空间占用取决于最大偏移量，编号非常稀疏且数值很大时可能浪费内存，因此更适合连续或较密集的编号。

#### HyperLogLog

[HyperLogLog](https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/) 用于估算集合的基数，即不重复元素的数量。它通过哈希和统计信息进行估算，不保存原始成员，因此无法列出成员、判断某个成员是否存在，或者删除单个成员。

##### `pfadd`、`pfcount`

添加待统计的元素，并获取不重复元素数量的估算值。下面用用户标识模拟网站访问，同一个用户重复访问不会被重复累计。

```redis
PFADD demo:uv:day1 "user:1" "user:2" "user:3"  # 添加待统计的用户标识
>>> 1  # 内部寄存器发生变化，不代表新增 1 个用户
PFADD demo:uv:day1 "user:1"  # 重复访问，不重复累计
>>> 0
PFCOUNT demo:uv:day1  # 估算当天的独立访客数
>>> 3
```

`PFADD` 返回 `1` 表示内部寄存器发生变化，返回 `0` 表示没有变化，并非返回新增用户数量。`PFCOUNT` 返回估算值，上面的小数据示例得到 `3`，不代表所有规模下都能精确计数。

##### `pfmerge`

合并多个 HyperLogLog，可以估算多天合计的独立访客数。同一个用户跨天访问，也只按一个独立访客估算。

```redis
PFADD demo:uv:day2 "user:2" "user:4"
>>> 1
PFCOUNT demo:uv:day1 demo:uv:day2  # 估算两天的去重访客总数
>>> 4

PFMERGE demo:uv:total demo:uv:day1 demo:uv:day2  # 将合并结果保存到 total
>>> OK
PFCOUNT demo:uv:total
>>> 4
```

#### GEO

GEO 保存成员的经纬度，底层基于 Sorted Set，将位置编码为分数，用于地理范围检索。常见用途包括查询附近门店、计算两个位置之间的距离。

##### `geoadd`

添加或更新位置，参数顺序为 **经度、纬度、成员名称**。下面使用巴勒莫（Palermo）和卡塔尼亚（Catania）的坐标演示。

```redis
# 每组参数依次为经度、纬度、成员名称
GEOADD demo:geo 13.361389 38.115556 "Palermo" 15.087269 37.502669 "Catania"
>>> 2
```

`GEOADD` 默认返回新增成员数量。

##### `geodist`

计算两个成员之间的地理距离。默认单位为米，也可以使用 `km`（千米）、`mi`（英里）或 `ft`（英尺）。

```redis
GEODIST demo:geo "Palermo" "Catania" km  # 计算两地距离，单位为千米
>>> "166.2742"
GEODIST demo:geo "Palermo" "Unknown" km
>>> (nil)
```

任意一个成员不存在时返回空值。这里计算的是基于地球模型的近似距离，不是道路导航距离。

##### `geosearch`

Redis **6.2 及以上版本**支持 [GEOSEARCH](https://redis.io/docs/latest/commands/geosearch/)。通过 `FROMMEMBER` 指定已有成员作为中心，`BYRADIUS` 指定搜索半径，`ASC` 表示按距离从近到远排列。

```redis
# 以 Palermo 为中心，搜索半径 200 千米内的成员，按距离升序排列
GEOSEARCH demo:geo FROMMEMBER "Palermo" BYRADIUS 200 km ASC
>>> ["Palermo", "Catania"]
```

搜索会包含中心成员本身。也可以用 `FROMLONLAT` 直接指定中心点的经纬度，或者用 `BYBOX` 按矩形范围搜索。

##### `zrem`

GEO 底层使用 Sorted Set，可以通过 `ZREM` 删除指定成员，通过 `ZCARD` 查看成员数量。

```redis
ZREM demo:geo "Catania"  # GEO 基于 ZSet，使用 ZREM 删除位置
>>> 1
ZCARD demo:geo
>>> 1
```

### 七、redis 事务处理与监控

Redis 事务将一组命令放入队列，在执行 `EXEC` 时按顺序执行，期间不会插入其他客户端的命令。需要注意，**Redis 事务不支持执行失败后的自动回滚**，不能将其理解为所有命令要么全部成功、要么全部撤销。

| 命令 | 作用 |
| --- | --- |
| MULTI | 开启事务，后续普通命令进入队列 |
| EXEC | 执行队列中的命令，按顺序返回各命令的结果 |
| DISCARD | 取消事务，清空尚未执行的命令队列 |
| WATCH | 监视指定 key，使后续事务在 key 未被修改时才执行 |
| UNWATCH | 取消当前连接对所有 key 的监视 |

#### 开启和执行事务

`MULTI` 之后，普通命令返回 `QUEUED`，表示成功入队，还没有真正执行。只有收到 `EXEC` 后，Redis 才会执行队列中的命令。

```redis
SET demo:tx:count 10
>>> OK

MULTI  # 开启事务
>>> OK
INCRBY demo:tx:count 5  # 加入队列，此时还没有加 5
>>> QUEUED
GET demo:tx:count  # 读取命令也会排队
>>> QUEUED
EXEC  # 按入队顺序执行，返回各命令的结果
>>> [15, "15"]
```

`MULTI` 到 `EXEC` 之间，其他客户端仍然可以操作数据库；只有 `EXEC` 执行队列期间，其他客户端的命令不会插入其中。

#### 取消事务

`DISCARD` 清空当前事务的命令队列，不执行队列中的命令。它不会撤销事务开启之前已经完成的操作。

```redis
SET demo:tx:count 10
>>> OK
MULTI
>>> OK
SET demo:tx:count 99
>>> QUEUED
DISCARD  # 放弃尚未执行的修改
>>> OK
GET demo:tx:count
>>> "10"
```

#### 事务中的错误

##### 入队阶段的错误

命令名错误、参数数量错误等问题，通常会在入队阶段被发现。事务被标记为无效，执行 `EXEC` 时返回 `EXECABORT`，队列中的命令都不会执行。

```redis
SET demo:tx:queued "before"
>>> OK
MULTI
>>> OK
SET demo:tx:queued "after"
>>> QUEUED
SET demo:tx:missing  # 缺少 value，入队时报错
>>> (error) ERR wrong number of arguments for 'set' command
EXEC
>>> (error) EXECABORT Transaction discarded because of previous errors.
GET demo:tx:queued
>>> "before"
```

`QUEUED` 只说明某条命令成功入队，不能保证事务最终执行。

##### 执行阶段的错误

有些错误需要执行时才能发现，例如对非整数字符串执行 `INCR`。此时出错的命令返回错误，其他命令仍会继续执行，已经完成的修改也不会回滚。

```redis
MULTI
>>> OK
SET demo:tx:value "hello"
>>> QUEUED
INCR demo:tx:value  # 入队成功，但执行时无法对 hello 做整数运算
>>> QUEUED
SET demo:tx:status "done"
>>> QUEUED
EXEC
>>> [OK, (error) ERR value is not an integer or out of range, OK]

GET demo:tx:value
>>> "hello"
GET demo:tx:status
>>> "done"
```

这里的错误作为 `EXEC` 返回数组中的一个元素出现，不会阻止最后一条 `SET` 执行。Redis 不提供事务回滚。

#### WATCH 与乐观锁

`WATCH` 用于监视一个或多个 key。它不会阻塞其他客户端写入，而是在 `EXEC` 时检查这些 key 是否自监视开始后被修改；只要有一个发生修改，整个事务就会放弃执行，返回空值。

这种方式称为**乐观锁**：先读取和计算，提交时检查是否有冲突，发生冲突后由客户端决定是否重新读取并重试。即使一个值先被改动、后来又被改回，也会被视为发生过修改。

下面打开两个连接到同一 Redis 实例、同一数据库的 `redis-cli` 终端，按顺序模拟库存竞争。

第一步：客户端 A 监视库存并读取。

```redis
SET demo:stock 10
>>> OK
WATCH demo:stock  # 必须在 MULTI 之前监视
>>> OK
GET demo:stock
>>> "10"
```

第二步：客户端 B 在 A 提交事务前修改库存。

```redis
DECR demo:stock  # 另一客户端先扣减了 1 件
>>> 9
```

第三步：客户端 A 尝试扣减 2 件。

```redis
MULTI
>>> OK
DECRBY demo:stock 2
>>> QUEUED
EXEC  # WATCH 检测到修改，队列中的扣减不会执行
>>> (nil)
GET demo:stock
>>> "9"
```

返回空值表示发生了监视冲突，

下面继续在客户端 A 中重试，假设期间没有其他客户端修改库存：

```redis
WATCH demo:stock
>>> OK
GET demo:stock  # 重新读取，客户端确认库存 9 足够扣减 2 件
>>> "9"
MULTI
>>> OK
DECRBY demo:stock 2
>>> QUEUED
EXEC
>>> [7]
```

库存检查由客户端在 `GET` 后完成，`MULTI` 本身不提供条件判断。如果只需要无条件加减，直接使用 `INCRBY`、`DECRBY` 等原子命令即可。

##### 取消监视

放弃更新时，可以使用 `UNWATCH` 取消当前连接对所有 key 的监视。

```redis
WATCH demo:stock
>>> OK
GET demo:stock
>>> "7"
UNWATCH  # 本次不更新，清除全部监视
>>> OK
```

调用 `EXEC` 后，无论成功还是因监视冲突而放弃，监视都会被清除；`DISCARD` 或断开连接也会清除监视。`WATCH` 关注的不只是其他客户端写入，当前连接在事务队列外的写入也会触发冲突；现代 Redis 中，key 过期或被淘汰同样可能使事务放弃执行。

#### 运行状态与命令监控

`WATCH` 监视的是事务依赖的数据是否变化。如果需要观察 Redis 服务状态或排查慢命令，可以使用下面的命令。

| 命令 | 用途 |
| --- | --- |
| INFO clients | 查看客户端连接信息 |
| INFO memory | 查看内存使用情况 |
| INFO stats | 查看命令处理量、命中次数等统计 |
| MONITOR | 实时查看服务器收到的命令 |
| SLOWLOG LEN | 查看当前保留的慢日志条数 |
| SLOWLOG GET 10 | 查看最近 10 条慢日志 |

##### `info`

[INFO](https://redis.io/docs/latest/commands/info/) 可以按分类查看运行状态。下面只展示部分字段，数值仅作示例，实际结果取决于实例的运行情况。

```redis
INFO clients  # 查看当前连接数量等信息
>>> # Clients
>>> connected_clients:2
>>> ...

INFO memory  # 查看内存使用情况
>>> # Memory
>>> used_memory_human:1.20M
>>> ...
```

##### `monitor`

在一个终端执行 `MONITOR`，随后在另一个终端发送命令，即可观察命令流。输出中的时间戳和客户端端口会随实际情况变化，下面使用占位符表示。

```redis
MONITOR  # 开始监听，按 Ctrl+C 结束
>>> OK
# 另一终端执行 SET demo:monitor "hello" 后，观察到：
>>> <时间戳> [0 127.0.0.1:<端口>] "SET" "demo:monitor" "hello"
```

`MONITOR` 会带来额外开销，适合短时间调试，不宜长期挂在繁忙的实例上。

##### `slowlog`

慢日志用于记录执行时间超过阈值的命令，计时不包含与客户端通信等网络 I/O 时间。阈值由 `slowlog-log-slower-than` 配置，单位为微秒；最大保留条数由 `slowlog-max-len` 配置。

```redis
# 假设当前没有慢日志，实际结果取决于实例运行情况
SLOWLOG LEN
>>> 0
SLOWLOG GET 10  # 最多读取最近 10 条记录
>>> []
```

没有慢日志并不代表请求一定没有延迟，还需要结合网络、客户端和服务端状态排查。

### 八、redis 持久化

Redis 主要在内存中处理数据，一旦系统断电，内存中的数据就会丢失。持久化是将数据保存到磁盘，使实例重启后能够重新加载，而不是只依赖进程中的内存。

Redis 提供 **RDB 快照**和 **AOF 日志**两种主要方式，可以单独使用，也可以同时开启。能恢复到哪个时间点，取决于最后成功保存的数据和所选择的刷盘策略。

| 对比项 | RDB | AOF |
| --- | --- | --- |
| 保存内容 | 某个时间点的数据快照 | 用于重建数据的写入操作 |
| 保存方式 | 定时或手动生成快照 | 持续追加，按配置同步到磁盘 |
| 数据丢失窗口 | 可能丢失上次快照之后的修改 | 取决于 fsync 策略，通常可以缩小丢失窗口 |
| 文件与恢复 | 通常较紧凑，适合备份和批量加载 | 需要加载基础数据并重放增量操作，重写可减少体积和恢复开销 |
| 主要开销 | 后台生成快照的 CPU、内存和磁盘 I/O | 持续写入、刷盘，以及后台重写的开销 |
| 常见用途 | 周期备份、允许一定数据丢失的场景 | 希望减少故障时写入丢失的场景 |

#### RDB（Redis Database）

##### 工作原理

RDB 将某个时间点的数据集保存为二进制快照，常见文件名为 `dump.rdb`。

执行后台保存时，Redis 通过 `fork()` 创建子进程，由子进程将快照写入临时文件，成功后再替换旧的 RDB 文件；父进程继续处理客户端请求。父子进程利用**写时复制（Copy-on-Write）**共享内存，保存期间被修改的内存页才需要复制。

后台保存仍会占用资源：`fork()` 本身可能造成短暂停顿，保存期间的写入也可能增加内存消耗，磁盘 I/O 则可能影响响应延迟。[官方延迟说明](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/)

##### 自动保存

可以通过 `save 秒数 修改次数` 配置自动保存条件，下面只是一组示例：

```text
# 距上次成功保存至少 60 秒，且至少发生 1000 次数据修改时触发快照
save 60 1000

# 快照文件名及保存目录
dbfilename dump.rdb
dir /var/lib/redis

# 对 RDB 数据进行压缩
rdbcompression yes
```

`save 60 1000` 不表示无论是否修改都每 60 秒保存一次，也不表示最多只会丢失 60 秒数据。它需要同时满足时间和修改次数条件，而且后台保存还需要时间完成；如果配置多条 `save` 规则，任意一条满足即可触发。

如需关闭定时 RDB 保存，可以将保存规则替换为 `save ""`。这不会禁止手动执行 `SAVE` 或 `BGSAVE`，也不等于同时关闭 AOF。

##### 手动保存

| 命令 | 作用 |
| --- | --- |
| SAVE | 同步生成 RDB，执行期间阻塞其他客户端命令 |
| BGSAVE | 启动后台 RDB 保存 |
| LASTSAVE | 返回最近一次成功保存 RDB 的 Unix 时间戳 |

下面假设没有其他冲突的后台任务，并且 Redis 有权限写入数据目录：

```redis
SET demo:persist:name "nagi"
>>> OK
BGSAVE  # 发起后台保存，返回时不代表文件已生成完毕
>>> Background saving started
```

可以通过 `INFO persistence` 观察保存状态。下面展示本次保存成功结束后的部分字段，其他字段省略：

```redis
INFO persistence
>>> # Persistence
>>> rdb_bgsave_in_progress:0
>>> rdb_last_bgsave_status:ok
>>> ...
```

`rdb_bgsave_in_progress` 为 `1` 表示正在保存，为 `0` 表示当前没有后台保存任务。

RDB 的优点是快照紧凑、便于保存多个历史版本，恢复大数据集通常也较快；不足是两次成功快照之间的修改可能在故障时丢失。快照越频繁，后台保存的资源开销通常也越大。

#### AOF（Append Only File）

##### 工作原理与刷盘策略

AOF 将执行后需要持久化的写入操作追加到日志中。重启时，Redis 加载这些记录来重建数据，而读取命令通常不需要记录。

```text
# 开启 AOF，并采用通常每秒同步一次的策略
appendonly yes
appendfsync everysec

# AOF 文件基础名称
appendfilename "appendonly.aof"
```

| appendfsync 策略 | 同步方式 | 特点 |
| --- | --- | --- |
| always | 每批追加后执行 fsync，再向客户端确认 | 刷盘频繁，通常有更强的持久性保证，但开销较大 |
| everysec | 通常每秒执行一次 fsync | 平衡性能与持久性，故障时可能丢失最近约一秒的写入 |
| no | 不主动执行 fsync，由操作系统决定刷盘 | 刷盘时机不可由 Redis 精确控制，丢失窗口可能更大 |

##### AOF 重写

持续追加会使日志越来越大。**AOF 重写**根据当前内存中的有效数据，生成能够恢复相同数据集的紧凑表示，而不是逐行读取旧日志后简单删除重复命令。

例如，一个计数器经历了多次 `INCR`，当前值为 `100`，恢复时只需能够得到这个最终状态，无需保留之前每次递增的完整历史。因此，AOF 重写也不提供完整的历史操作审计。

可以配置自动重写，下面表示文件至少达到 64 MB，且相对基准大小增长至少 100% 时触发：

```text
# 两个条件需要同时满足
auto-aof-rewrite-min-size 64mb
auto-aof-rewrite-percentage 100
```

也可以手动发起。下面假设已开启 AOF，且当前没有冲突的后台任务：

```redis
BGREWRITEAOF  # 发起后台重写，不会清空当前内存数据
>>> Background append only file rewriting started
```

#### 混合持久化与同时启用

**同时启用 RDB 和 AOF**，表示既生成独立的 RDB 快照，也持续维护 AOF。快照可以用于周期备份，AOF 则用于缩小故障恢复时的数据丢失窗口。

**AOF 使用 RDB 格式的基础数据**是另一个相关概念，常称为混合持久化：通过下面的配置，在 AOF 重写时使用 RDB 格式保存基础数据，再结合后续的 AOF 增量记录恢复。

```text
# 在 AOF 重写中使用 RDB 格式保存基础数据
aof-use-rdb-preamble yes
```

这种格式可以兼顾基础数据的加载效率和增量日志的持久化能力。它不等于单独开启定时 RDB 快照；即使没有定时生成独立的 `dump.rdb`，AOF 的基础部分仍然可以采用 RDB 格式。

#### 恢复与状态检查

Redis 启动时按配置加载持久化数据。在 RDB 和 AOF 都开启的正常启动流程中，**优先使用 AOF 恢复**，因为它通常包含比独立快照更新的写入；不会先加载独立的 `dump.rdb`，再随意叠加一份完整 AOF。

AOF 中包含 RDB 基础数据时，则先加载该基础部分，再重放与之配套的增量操作。文件缺失或损坏需要结合启动日志排查，不能假设 AOF 出错后一定会自动切换到 RDB。

`INFO persistence` 可以查看两种机制的状态。下面仅展示 AOF 已开启、相关后台任务完成且最近操作成功时的示例字段：

```redis
INFO persistence  # 字段取值以实际运行状态为准
>>> # Persistence
>>> rdb_bgsave_in_progress:0
>>> rdb_last_bgsave_status:ok
>>> aof_enabled:1
>>> aof_rewrite_in_progress:0
>>> aof_rewrite_scheduled:0
>>> aof_last_bgrewrite_status:ok
>>> aof_last_write_status:ok
>>> ...
```

`aof_enabled:1` 只代表 AOF 已开启，仍需检查重写、写入状态以及实际文件。

#### 如何选择

- **数据可以从其他系统重建的缓存**：可以根据恢复成本选择 RDB，或者不启用持久化，但需要考虑冷启动时的数据库压力。
- **允许丢失两次快照之间的修改**：可以使用 RDB，并按业务接受的数据丢失窗口配置保存规则。
- **希望减少近期写入丢失**：可以使用 AOF，并根据延迟要求选择 fsync 策略，配合定期 RDB 快照保存历史备份。

### 九、redis 问题

在常见的旁路缓存（Cache Aside）模式中，应用先查询 Redis，命中则直接返回；未命中时查询数据库，再将结果写回缓存。缓存穿透、缓存击穿和缓存雪崩都是这一流程在特定访问模式下可能出现的问题。

| 问题 | 典型触发条件 | 数据库中的数据 | 主要应对方法 |
| --- | --- | --- | --- |
| 缓存穿透 | 持续请求不存在的数据，缓存始终无法命中 | 不存在 | 参数校验、短期缓存空结果、布隆过滤器 |
| 缓存击穿 | 一个热点 key 失效，大量请求同时回源 | 通常存在 | 合并请求、互斥重建、提前刷新或逻辑过期 |
| 缓存雪崩 | 大量 key 集中过期，或缓存服务不可用 | 通常存在 | TTL 随机化、限流降级、高可用与分批预热 |

#### 缓存穿透

##### 产生原因

请求的数据在 Redis 和数据库中都不存在。如果应用只缓存查到的正常数据，每次查询不到结果就直接返回，那么同一个无效查询会反复访问数据库。

例如，数据库中没有编号为 `404` 的用户，客户端却不断查询该用户。缓存每次都未命中，数据库也每次都返回不存在，这类请求便“穿透”了缓存。

##### 应对方法

- **参数校验**：在访问缓存和数据库之前，校验 ID 格式、取值范围和访问权限，尽早拒绝明显无效的请求。
- **缓存空结果**：数据库明确返回不存在时，缓存一个有较短 TTL 的专用标记，减少相同无效查询的重复回源。
- **布隆过滤器**：提前登记有效的数据标识，在昂贵的数据库查询之前过滤掉确定不存在的标识。
- **限制异常请求**：对高频无效查询进行限流，避免大量不同的随机 ID 持续消耗数据库和缓存资源。

#### 缓存击穿

##### 产生原因

一个访问量很大的热点 key 过期或失效时，大量并发请求同时发现缓存未命中，于是一起查询数据库，造成瞬时压力。

例如，某个热门商品平时每秒被查询数千次，缓存过期后，原本由 Redis 承担的请求在缓存重建期间集中落到数据库。重点在于**同一个热点数据被并发重建**，不要求大量 key 同时过期。

##### 应对方法

- **互斥重建或请求合并**：对于同一个 key，尽量让一个请求负责查数据库并填充缓存，其他请求有界等待并重读缓存。单进程可以合并本地请求，多个应用实例之间则需要共享协调机制。
- **提前刷新或逻辑过期**也可以用于热点数据：在缓存到期前异步刷新，或者在缓存内容中保存业务过期时间，过期后暂时返回允许使用的旧数据，并由一个任务异步更新。

#### 缓存雪崩

##### 产生原因

大量缓存数据在相近时间失效，或者 Redis 服务不可用，导致缓存层在较大范围内失去保护作用，大量不同数据的请求集中回源，引起数据库过载。

常见场景包括批量导入数据时设置相同 TTL、活动开始时大量预热数据集中到期、缓存服务故障，以及重启或迁移后缓存尚未恢复。

与击穿相比，雪崩强调**失效范围较大**。即使单个 key 没有特别高的访问量，大量 key 同时回源也可能压垮数据库。

##### 应对方法

- **分散过期时间**：由应用为每个 key 分别计算 TTL，在基础时间上加入随机偏移，降低批量数据集中失效的概率。例如，基础 TTL 为 600 秒，额外随机增加 0 到 120 秒。
- **限流、熔断与降级**：限制回源的并发数和速率，设置合理的超时与重试预算；缓存持续故障时，对允许的业务返回旧数据、默认结果或明确的繁忙提示。不要在 Redis 报错时，让所有请求无上限地转去查询数据库。
- **提高可用性**：按业务需求配置主从复制、Sentinel 故障转移或 Redis Cluster，并在客户端正确处理重连和故障。高可用可以缩短故障窗口，但不能代替数据库保护措施。
- **分批预热与恢复**：活动前预热热点数据，冷启动后分批重建缓存，对恢复速度进行限流，同时给预热数据设置分散的 TTL。逐步恢复流量，避免缓存刚恢复就触发新一轮集中回源。

### 十、redis 配置文件说明

Redis 通常使用 `redis.conf` 保存服务端配置。配置文件通常位于 `/etc/redis/redis.conf`，具体路径也可以从服务启动参数中确认。

#### 网络与连接

```text
# 仅监听本机 IPv4 回环地址
bind 127.0.0.1

# 监听端口
port 6379

# 保持保护模式开启
protected-mode yes

# 不因普通客户端空闲而主动断开连接
timeout 0

# 启用 TCP 保活探测，帮助发现失效连接
tcp-keepalive 300
```

`bind` 指定的是 Redis 所在机器的监听地址，不是允许连接的客户端 IP 列表。

#### 身份认证

`requirepass` 可以为默认用户配置密码。

```text
# 为默认用户设置认证密码
requirepass "replace-with-a-long-random-password"
```

假设已经加载上述配置，未认证的连接执行普通命令时会收到 `NOAUTH` 错误，可以通过 `AUTH` 认证：

```redis
PING
>>> (error) NOAUTH Authentication required.
AUTH "replace-with-a-long-random-password"  # 在当前连接上认证
>>> OK
PING
>>> PONG
```

#### 进程、日志与数据库

```text
# 日常运行日志级别
loglevel notice

# 日志目录需要允许 Redis 进程写入
logfile "/var/log/redis/redis-server.log"

# 使用 SELECT 0 到 SELECT 15 切换逻辑数据库
databases 16
```

使用 Ubuntu 的 `redis-server` systemd 服务时，进程管理选项应与服务启动参数保持一致，不要为了“后台运行”就直接改成 `daemonize yes`。

#### 内存限制与淘汰策略

`maxmemory` 设置 Redis 用于判断是否触发淘汰的内存上限，`maxmemory-policy` 决定达到上限后如何处理。

```text
# 示例上限，实际应根据机器和业务容量设置
maxmemory 256mb

# 不主动淘汰 key，拒绝需要增加内存的写入
maxmemory-policy noeviction
```

常见策略如下：

| 策略 | 说明 |
| --- | --- |
| noeviction | 不淘汰 key，超限时对需要增加内存的写命令返回错误 |
| allkeys-lru | 在所有 key 中近似淘汰最近较少使用的 key |
| allkeys-lfu | 在所有 key 中近似淘汰使用频率较低的 key |
| volatile-lru | 仅在设置了过期时间的 key 中使用近似 LRU 淘汰 |
| volatile-ttl | 仅在设置了过期时间的 key 中优先淘汰剩余生存时间较短的 key |
| allkeys-random | 在所有 key 中随机淘汰 |

#### 慢日志配置

```text
# 执行时间超过 10000 微秒（10 毫秒）的命令记入慢日志
slowlog-log-slower-than 10000

# 最多保留 128 条记录，满后淘汰旧记录
slowlog-max-len 128
```

`slowlog-log-slower-than` 设为 `0` 表示记录所有命令，设为负数表示关闭慢日志。这里统计的是命令执行时间，不包含客户端通信等网络 I/O 时间；日志保存在内存中，通过 `SLOWLOG GET` 查看，不会自动写入 `logfile` 指定的普通日志文件。

#### 查看、修改与保存配置

##### `config get`、`config set`

`CONFIG GET` 查看当前生效值，`CONFIG SET` 在运行时修改受支持的配置项。下面先将普通客户端空闲超时改为 60 秒，再读取确认：

```redis
CONFIG SET timeout 60  # 立即修改当前实例，无需重启
>>> OK
CONFIG GET timeout
>>> ["timeout", "60"]
```

`CONFIG SET` 只改变运行时配置，不会自动修改配置文件；重启后仍按启动时读取的文件加载。并非所有配置项都支持运行时修改，具体以使用版本的命令结果和官方文档为准。

### 十一、go-redis

Redis 支持 Go、Java、Python 等多种编程语言的客户端，可以在应用程序中连接 Redis 并执行相关命令。Go 语言的官方 Redis 客户端是 [go-redis](https://github.com/redis/go-redis)。

### 十二、redis 面经

[redis 常见简单面试题](https://learnku.com/articles/67307)
