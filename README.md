# 基于 Node-RED 的企业微信消息推送服务

### 企业微信推送有以下优点：

- 自建服务，除非企业微信停服
- 可以接收用户发送的`文字`、`语音`、`图文`等
- 可以向用户发送的`文字`、`语音`、`图文`、`卡片`等
- 更好的私密性

### 手摸手从零开始教程

* 企业微信注册没啥要求随意注册即可使用.[注册企业微信](https://work.weixin.qq.com/wework_admin/register_wx)

* 获取企业 ID, `企业 ID`在`我的企业`最下面可以找到
	![图片](https://github.com/chen-designs/node-red-contrib-wechats/master/resources/config-0.png)

* 创建应用
	![图片](https://github.com/chen-designs/node-red-contrib-wechats/master/resources/config-1.png)
	![图片](https://github.com/chen-designs/node-red-contrib-wechats/master/resources/config-2.png)

* 获取配置信息, 直接进入应用里面可以获取到`AgentId`、`Secret`
	![图片](https://github.com/chen-designs/node-red-contrib-wechats/master/resources/config-3.png)

* 接收消息设置, 模块中有`设置API接收`，用来设置企业微信请求的`URL` `Token` `EncodingAESKey`
	**特别注意： 先把这些信息填写到node-red节点信息中，然后才能验证通过此步**
	![图片](https://github.com/chen-designs/node-red-contrib-wechats/master/resources/config-4.png)

* 配置 Node-RED 节点信息
	![图片](https://github.com/chen-designs/node-red-contrib-wechats/master/resources/config-5.png)
