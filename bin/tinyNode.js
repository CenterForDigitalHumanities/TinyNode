#!/usr/bin/env node

/**
 * Module dependencies.
 */

import dotenv from "dotenv"
dotenv.config()
import app from "../app.js"
import debug from 'debug'
debug('tinynode:server')
import http from "http"


/**
 * Get port from environment and store in Express.
 */

const envPort = normalizePort(process.env.PORT)
if (process.env.PORT && !envPort) console.warn(`Invalid PORT "${process.env.PORT}", using 3002`)
const port = envPort || 3002
app.set('port', port)

/**
 * Create HTTP server.
 */

const server = http.createServer(app)

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

/**
 * Normalize a port into a valid TCP port number or false.
 */

function normalizePort(val) {
  const port = Number(val)

  if (Number.isInteger(port) && port >= 1 && port <= 65535) {
    return port
  }

  return false
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = 'Port ' + port

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges')
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(bind + ' is already in use')
      process.exit(1)
      break
    default:
      throw error
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  console.log('Listening on port ' + server.address().port)
}
