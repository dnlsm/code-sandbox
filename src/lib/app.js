import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

export class App {

    static {
      App.initialize  = (app) => {
          if(app instanceof App){

          } else{ throw new Error(`Must extends type "App"`) }
      }
    }

    /* IP Filter fallback default values*/
    #ipfilter = "Blacklist"
    #whitelist = []
    #blacklist = []

    get IPFILTER(){
      return {
        mode: this.#ipfilter,
        whitelist: this.#whitelist,
        blacklist: this.#blacklist
      }
    }


    constructor(configPath){
      if(this.constructor === App) throw new Error("[App::constructor()] Application class must be extended")
      let config;

      try {
        JSON.parse(readFileSync( resolve(configPath) ).toString())
      }
      catch(err){
          //bypass import error
      }

      this.#ipfilter = config?.ipfilter || this.#ipfilter
      this.#whitelist = config?.whitelist || this.#whitelist
      this.#blacklist = config?.blacklist || this.#blacklist
    }


    /* Incoming request from "req.socket.remoteAddress"
       Filter incomming connection, and forward to app serve */
    static forward(req, res, app){
        let IPFILTER = app.IPFILTER
        if(IPFILTER.mode){
          switch(IPFILTER.mode){
            case "Whitelist":
              if(IPFILTER.whitelist.includes(req.socket.remoteAddress)){
                App.#serve(req, res, app)
              }else {
                res.statusCode = 401;
                res.end("401 - Unauthorized")
                Log(req)("401 - Unauthorized")
              } break;
            case "Blacklist":
              if(!IPFILTER.blacklist.includes(req.socket.remoteAddress)){
                App.#serve(req, res, app)
              }else {
                res.statusCode = 401;
                res.end("401 - Unauthorized")
                Log(req)("401 - Unauthorized")
              } break;
            default:
              throw new Error("Invalid IPFILTER param")
          }
        } else { res.statusCode = 401; res.end() }
    }

    static #serve(req, res, app){
        let Print = Log(req)    // Request Log initialization

        // Writer repleacement for log body size
        res.$write = res.write
        res._sizeWriten = 0
        res.write = __Write

        req.$write = req.write
        req.write = __Write
        function __Write(chunk, ...options){
          this.$write.call(this, chunk, ...options)
          this._sizeWriten += chunk.length
        }

        res.$end = res.end
        res.end = __end

        function __end(chunk, ...options){
          this.$end.call(this, chunk, ...options)
          if(chunk) this._sizeWriten += chunk.length
        }

        // Event listening for Logs
        res.on('finish', () => {
            Print(`--Status-Code: ${res.statusCode}\t-- Content-Size: ${res._sizeWriten}`)
        })

        res.on('error', (err) => {
            Print(` -- Error:\t\t${err}`)
        })

        // Router forward
        try {
            app.render(req, res)
        }
        catch(err) {
            /* Default 500 - Bad Server Response */
            res.statusCode = 500
            res.write(err.message)
            res.end()
        }
    }

    render(req, res) {
        if(this.constructor !== App) throw new Error(`[${this.constructor}::App::render()] Super function must not be called`)
        throw new Error(`[App::render()] Function must be extended`)
    }
}

function Log(req){
    let Stamp = `[${req.socket.remoteFamily}] ${req.socket.remoteAddress} (:${req.socket.remotePort}) ${req.url}`

    function log(...params) {
      let date = new Date()
      console.log(`${date.toLocaleString()}\t${Stamp}\t`,...params)
      return log
    }

    return log
}