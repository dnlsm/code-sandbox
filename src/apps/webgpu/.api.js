import { Router, serveStatic } from '#lib/router.js'
import { readFileSync } from 'fs'
import { resolve } from 'path'


class TodoRouter extends Router {
	constructor(){
		super()

		this.get(/^\/$/, ({res})=>{
			res.writeHead(302, { 'Location': '/webgpu/index.html'})
			res.end()
		})
		this.all( serveStatic(import.meta.dirname) )
	}
}

export function setup(){
	let router = new TodoRouter()
	return router
}