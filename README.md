# sf-async

[async.auto](https://github.com/caolan/async)的替代方案，用于做多个服务请求的自动编排和数据聚合，支持服务并行请求、服务串行请求，服务复杂串并行请求

通过类继承`SfAsync`的方式，子类只需要实现`deps`属性和服务请求方法，`deps`用于声明服务之间的依赖关系

使用
```js
pnpm add sf-async
```

服务串行请求：
```js
class DemoAsync extends SfAsync {
  get deps () {
    return {
      getData: ['getId'] // 表示getData依赖了getId的返回结果
    }
  }
  async getId () {
    return '1'
  }
  async getData (req, res, { deps }) {
    const { getId } = deps
    return { id: getId, data: 'xx' }
  }
}

const demoAsync = new DemoAsync(req, res, params)
const { getData } = await demoAsync.run(['getData']) // 只需要手动传入getData，会根据deps自动调用getId

console.log(getData) // print { id: getId, data: 'xx' }
```

服务并行请求
```js
class DemoAsync extends SfAsync {
  get deps () { return {} } // 没有任何依赖，deps可以不写
  async getData1 () {
    return '1'
  }
  async getData2 () {
    return '2'
  }
}

const demoAsync = new DemoAsync(req, res, params)
const { getData1, getData2 } = await demoAsync.run(['getData1', 'getData2']) // 默认就会去并发请求getData1、getData2

console.log(getData1) // print 1
console.log(getData2) // print 2
```

复杂的串并行请求
```js
class DemoAsync extends SfAsync {
  get deps () {
    return {
      getData2: ['getId']
    }
  }
  async getId () {
    return 'id1'
  }
  async getData1 () {
    return 'data1'
  }
  async getData2 (req, res, { deps }) {
    return { id: deps.getId, data: 'data2' }
  }
}

const demoAsync = new DemoAsync(req, res, params)
const { getData1, getData2 } = await demoAsync.run(['getData1', 'getData2'])

console.log(getData1) // print data1
console.log(getData2) // print { id: 'id1', data: 'data2' }
```

支持在运行时确定服务请求的依赖关系：
```js
class DemoAsync extends SfAsync {
  get deps () {
    const { isFirstPage } = this.params
    return {
      getData1: isFirstPage ? ['getData2'] : ['getData3'],
    }
  }
  async getData1 (req, res, { deps }) {
    const { getData2, getData3 } = deps
    return { getData2, getData3 }
  }
  async getData2 () {
    return 'data2'
  }
  async getData3 () {
    return 'data3'
  }
}

new DemoAsync(req, res, { isFirstPage: req.query.isFirstPage })
```
