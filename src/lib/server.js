import { createServer } from "http"
import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
import { App } from "./app.js"

export class Server {

    static {
      Server.initialize  = (server) => {
          if(server instanceof Server){

          } else{ throw new Error(`[static Server::initialize()] Object must extends [Server]`) }
      }
    }

    #port;
    get port() { return this.#port }

    constructor(){
      if(this.constructor === Server) throw new Error("[Server::constructor()] Abstract class must not be instantiated")
      Server.initialize(this)
    }

    #app;
    render(app){
      if(!app instanceof App) throw new Error('[Server::render()] Invalid app argument')

      this.#app = app
      return this
    }

    #server = false;
    get isOnline() { return (this.#server)?(true):(false) }

    start(port){
      /* Verify server is not running yet */
      if(this.#server) throw new Error(`[Server::start()] Server already running at port ${this._PORT}, please stop server before starting it again`)

      /* Validates Port argument */
      if(port === null || port === undefined) throw new Error("[Server::start()] Must specify a PORT argument")
      if(port.constructor !== Number) throw new Error("[Server::start()] Specify an valid [Number] as PORT argument")

      this.#port = port


      /* Start server */
      this.#server = createServer((req, res) => {

        // TODO: Implement Host Forwarding
        this.#app.constructor.forward(req, res, this.#app)

      }).listen(this.#port)

    }

    stop(){
      throw new Error('[Server::stop()] Function not implemented yet')
    }

}

