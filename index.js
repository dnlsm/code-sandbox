import { get, request } from "http"
import { resolve } from "path"

import * as myApplication from './src/main.js'

const { keys } = Object
const PORT = 5051

try {
  myApplication.default(PORT)
}
catch(err){
  console.log(err);
}
finally {
  let url = new URL(`http://localhost:${PORT}`)
  get(url.href, (res) => {
      console.log(`__Loaded content (requested @ [get] ${res.req.socket.remoteAddress} port ${res.req.socket.remotePort})`)
      //console.log(`${keys(res)}`)
      //console.log(``); console.log(res.rawHeaders)
      //console.log(`${keys(res.req)}`)
      console.log(`${res.req.method} ${url.pathname}${url.search}${url.hash} ${url.protocol} ${res.httpVersion}`)
      console.log(``)
      console.log(`${url.protocol}/${res.httpVersion}`,res.statusCode, res.statusMessage)
  }).on('socket', (socket) => {
      socket.on('data', data => {
        console.log(data)
        console.log(data.toString(), '\n')
      })
      socket.emit('agentRemove');
  })
}