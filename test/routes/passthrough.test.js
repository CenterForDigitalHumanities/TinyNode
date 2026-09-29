import "../helpers/env.js";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import express from "express";
import request from "supertest";
import createRoute from "../../routes/create.js";
import { messenger } from "../../error-messenger.js";

const routeTester = express();
routeTester.use(express.json({ type: ['application/json', 'application/ld+json'] }));
routeTester.use(express.urlencoded({ extended: false }));
routeTester.use('/create', createRoute);
routeTester.use('/app/create', createRoute);
routeTester.use(messenger);

let originalFetch = global.fetch;
let lastFetchOptions = null;

beforeEach(() => {
  lastFetchOptions = null;
  global.fetch = async (url, opts) => {
    lastFetchOptions = opts;
    return {
      json: async () => ({ "@id": "dummy", test: "item" }),
      ok: true,
      text: async () => ""
    };
  };
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('Passthrough Authorization header preservation', () => {
  it('forwards the exact Authorization header to upstream', async () => {
    const token = 'Bearer ABC123';
    const resp = await request(routeTester)
      .post('/create')
      .set('Authorization', token)
      .set('Content-Type', 'application/json')
      .send({ test: 'item' });
    assert.equal(resp.statusCode, 201);
    assert.ok(lastFetchOptions, 'fetch should have been called');
    assert.equal(lastFetchOptions.headers['Authorization'], token);
  });
});
