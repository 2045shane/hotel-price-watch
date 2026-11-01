# 功能映射

| 功能 | 输入与流程 | 本地存储 |
| --- | --- | --- |
| 加入追踪 | Booking `/hotel/*` 可见酒店名、首个可见价格、URL checkin/checkout 优先，其次日期元素文本；必填缺失时提示 | tracks：id、name、url、checkin、checkout、recordedPrice、currency、lastCheckedAt、lastCheckedPrice、lastCurrency、result、error |
| 检查降价 | 手动点击后依次打开后台标签页，轮询最多约 20 秒，读取价格后关闭；日期改变拒绝比较；同币种低于记录价高亮 | 更新检查时间、上次价格、结果；读取失败保留旧价格并标明失败 |
| 删除 | popup 每条删除 | 移除条目，不扣配额 |
| 配额 | 本机本地日历日期每天共 3 次；加入 1 次，全部列表检查合计 1 次；验证输入后扣次，网络读取失败仍计次；空列表检查不扣；重新加入也扣次 | hpwQuota：date、count；跨天自动归零；后台串行化避免并发覆盖 |
| license | popup 本地输入 HPW1 校验码，SHA-256 项目标识摘要，scripts/gen-license.mjs 生成 | hpwLicense；有效即绕过配额，不上传 |

超限 CTA：小红书私信『珊哥爱读书』获取解锁码。

## 权限与数据

只使用 storage 权限与 Booking/Agoda 的 HTTPS host_permissions。tabs.create、sendMessage、remove 无需 tabs 敏感权限；没有 scripting、alarms、notifications，没有定时检查或通知。content script 只在 Booking 酒店页和 Agoda 页注入。所有记录与解锁码存 chrome.storage.local；访问酒店站点会正常向该站点发送请求，不向其他服务器上报。

## 已知限制

Booking DOM 易变，必须定期维护 src/content/selectors.js 并实机验证。Agoda 选择器为 TODO，占位不保证读取成功。当前取首个可见价格，不能保证房型、每晚/总价、入住人数、税费、早餐、会员价或取消条款一致；仅提示可能值得退改/重订。日期 URL 参数优先，缺失则读取日期文本；不自动改选日期或绕过登录、验证码、反爬限制。符号 ¥/$ 无币种代码时保留不明确币种，禁止比较。

手动打开链接后重新加入会替换相同 URL 的记录基准；不同 URL 分别存储。检查时间表示尝试时间；失败时上次价格是历史成功读取值。页面可能重定向或渲染超过等待时限，提示手动打开核对。检查很多酒店可能受 MV3 worker 生命周期限制，popup 关闭后结果仍由 worker 尝试写入，但不保证任务持久执行。

license 沿用参考项目公开离线摘要风格，无秘密、无签名服务器、不能防破解；用户可修改本地存储、时间或代码绕过配额。无支付 SDK。请自行核对取消政策与价格条款，本插件不代下单。
