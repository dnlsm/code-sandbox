import { App } from "./lib/app.js"
import { Server } from "./lib/server.js"
import { resolve } from "path"

import { Router } from "./lib/router.js"



/* Custom App class */
class MyApp extends App{

	#router;
	constructor(...args){
		super(...args)
		this.#router = new ModuleRouter()
	}
	render(req, res){
		this.#router.digest(req, res)
	}

}


/* Custom router for handling modular load (from folders) */
class ModuleRouter extends Router{
	#modules = [];

	constructor(){
		super()

		setImmediate(() => { this.setup() })
	}

	setup(){

		this.get(/^\/(?:index.html)?$/, ({res}) => {
			res.setHeader('Content-Type', 'text/html')
			res.end(`<h1>My APP</h1>`)
		})
		this.all(/^\/(?<module_name>[A-Za-z0-9_]+?)(?<pathname>\/|$)/, (...params) => { this.moduleResolver(...params) })
	}

	async moduleResolver(...params){
		let [ {req, res, match}, next] = params

		const moduleName = match[0].groups['module_name']
	
		let moduleSearch = this.#modules.find(({name}) => name === moduleName)
		if(!moduleSearch){
			try{
				let moduleImport;

				try {
					moduleImport = await import(`./apps/${moduleName}/.api.js`)
				}
				catch(err){
					throw new Error(`[${this.constructor.name}::async moduleResolver()] module '${moduleName}' could not be loaded`)
				}

				let moduleRouter = moduleImport.setup(Router)

				if(!moduleRouter || !(moduleRouter instanceof Router))
					throw new Error(`[ModuleRouter::async #moduleResolver()] module '${moduleName}::setup()' must return a valid router`)

				this.route(new RegExp(`^\/(?<module_name>${moduleName})(:?\/|$)`), moduleRouter)

				let moduleRegister = {
					name: moduleName,
					module: moduleImport,
					router: moduleRouter
				}
				this.#modules.push(moduleRegister)
				this.digest(req, res)
			}
			catch(err){
				res.statusCode = 500
				res.end(err.message)
			}
		} else{

			next()
		}
	}

}


/* Main function - Initializes full application server */
export default function(serverPort){

	/* Initialize application */
	let IPFilterPath = resolve(import.meta.dirname, './filter.json')
	let app = new MyApp( IPFilterPath )


	/* Attach app to server and start listening */
	let server = new class extends Server{}()
	server.render(app).start(serverPort)



	/* Return server start info */
	return {server, app}
}
