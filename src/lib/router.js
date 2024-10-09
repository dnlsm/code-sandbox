class TypeRouter {}
class TypeURL {}
class TypeAll {}

export class Router {
	#routeStack = []
	#methods = ['GET', 'POST']

	constructor(){
		this.#methods.forEach(method => this.#registerMethod(method))
	}

	#registerMethod(method){
		if(!method) throw new Error('[Router::registerMethod()] @method param must be specified')
		if(!([String].includes(method.constructor))) throw new Error('[Router::registerMethod()] @callback param invalid type')

		if(this[method.toLowerCase()]) throw new Error(`[Router::registerMethod()] Method '${method}' already registered`)

		this[method.toLowerCase()] = function (url, callback){
			if(!url) throw new Error(`[Router::${method.toLowerCase}()] @url param must be specified`)
			if(![RegExp, String].includes(url.constructor))	throw new Error(`[Router::${method.toLowerCase}()] @url param invalid type`)

			if(!callback) throw new Error(`[Router::${method.toLowerCase}()] @callback param must be specified`)
			if(!(callback instanceof Function))	throw new Error(`[Router::${method.toLowerCase}()] @callback param invalid type`)

			this.#routeStack.push({
				type: TypeURL,
				method: method.toLowerCase(),
				url, callback
			})

			return this

		}
	}

	route(url, router){
		if(!url) throw new Error('[Router::route()] @url param must be specified')
		if(![RegExp, String].includes(url.constructor))	throw new Error('[Router::route()] @url param invalid type')

		if(!router) throw new Error('[Router::route()] @router param must be specified')
		if(!(router instanceof Router)) throw new Error('[Router::route()] @router param invalid type')

		this.#routeStack.push({
			type: TypeRouter,
			url, router
		})

		return this
	}

	all(...params){
		if(params.length === 2){
			let [url, callback] = params

			if(url && ![RegExp, String].includes(url.constructor))	throw new Error('[Router::all()] @url param invalid type')
			if(!callback) throw new Error(`[Router::all()] @callback param must be specified`)
			if(!(callback instanceof Function))	throw new Error(`[Router::all()] @callback param invalid type`)

			this.#routeStack.push({
				type: TypeAll,
				url,
				callback
			})
		}
		else if(params.length === 1){
			let [callback] = params
			if(!callback) throw new Error(`[Router::all()] @callback param must be specified`)
			if(!(callback instanceof Function))	throw new Error(`[Router::all()] @callback param invalid type`)

			this.#routeStack.push({
				type: TypeAll,
				url: null,
				callback
			})
		}
		else{
			throw new Error('[Router::all()] Invalid params')
		}

		return this

	}

	#process(state, stack){
		stack = [...(stack || this.#routeStack)]
		console.log(`<${this.constructor.name}>: ${state.url.pathname}`)
		let lock = false
		const next = (function next(){
			if(lock) throw new Error('[Router::process()@next()] next must be called once')
			lock = true

			if(stack.length !== 0) this.#process(state, stack)
		}).bind(this)

		while(stack.length > 0){
			let node = stack.shift()
			if(node.type === TypeRouter){
				let match = state.url.pathname.match(node.url)

				if(match){
					state.match.unshift(match)

					let newURL = new URL(state.url)
					newURL.pathname = newURL.pathname.replace(node.url, '/')
					newURL.protocol = node.router.constructor.name

					node.router.#process({
						...state,
						url: newURL
					})
					break;
				}
			}

			if(node.type === TypeURL){
				if(node.method === state.method){
					let match = state.url.pathname.match(node.url)
					if(match){
						state.match.unshift(match)
						node.callback(state, next)

						break;
					}
				}
			}

			if(node.type === TypeAll){
				if(node.url){
					let match = state.url.pathname.match(node.url)
					if(match){
						state.match.unshift(match)
						node.callback(state, next)
					}
				}
				else{
					node.callback(state, next)
				}

				break;
			}

		}

	}

	digest(req, res){
		if(!req) throw new Error('[Router::digest()] @req param must be specified')
		if(!res) throw new Error('[Router::digest()] @res param must be specified')

		let state = {
			method: req.method.toLowerCase(),
			url: new URL(req.url, `${this.constructor.name}://local`),
			req, res,
			match: []
		}

		this.#process(state)

	}
}


import { readFileSync, createReadStream, statSync } from 'fs'
import { resolve, join } from 'path'
export function serveStatic(srcPath){
	return function({url, res, req}) {
		let filepath = resolve(join(srcPath, url.pathname))
		console.log(`serving ${filepath}`)
		let file;

		let mime = "application/octet-stream";

		let format = url.pathname.match(/\.(?<format>\w+)$/)
		if(format && ['mp4','flv','avi','mpeg'].includes(format.groups['format']))
			mime = `video/${format.groups['format']}`

		if(format && ['html', 'htm', 'js'].includes(format.groups['format']))
			mime = `text/${format.groups['format']}`
		

		if(req.headers.range){
			try {
				let stat = statSync(filepath)

				let {start, end} = req.headers.range.match(/bytes=(?<start>\d+)-(?<end>\d*)$/).groups
				start = Number.parseInt(start)
				end = (end !== '')?(Number.parseInt(end)):(Math.min(start + 1048576 - 1, stat.size - 1))

				res.writeHeader(206, {
					'Accept-Ranges': 'bytes',
					'Content-Range': `bytes ${start}-${end}/${stat.size}`,
					'Content-Length': end - start + 1,
					'Content-Type': mime
				})


				file = createReadStream( filepath , {start, end})

				file.pipe(res)

			}
			catch(err){
				res.statusCode = 500
				res.end(err.toString())
			}
		}
		else{
			try {
				let stat = statSync(filepath)

				file = createReadStream( filepath )
				res.writeHeader(200, {
					'Accept-Ranges': 'bytes',
					'Content-Length': stat.size,
					'Content-Type': mime
				})

				file = createReadStream( filepath )
				//res.end()
				file.pipe(res)

			}
			catch(err){
				res.statusCode = 500
				console.log(err)
				res.end(err.toString())
			}
		}

	}
}