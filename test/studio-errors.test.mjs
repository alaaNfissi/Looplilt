import test from 'node:test';
import assert from 'node:assert/strict';
import {redactStudioError} from '../lib/studio/errors.mjs';
test('render diagnostics redact the original browser stack and nested causes',()=>{
 const token='a'.repeat(64),message='page.goto: Timeout navigating to http://127.0.0.1:4181/studio/render/#render='+token;
 const cause=new Error('Private workspace http://127.0.0.1:4181/studio/#workspace='+token);
 const failure=new Error(message,{cause});failure.stack='Error: '+message+'\nCall log:\n - navigating to #render='+token+'\n at render.mjs:48';
 const redacted=redactStudioError(failure);
 assert.equal(redacted,failure);assert.ok(!failure.message.includes(token));assert.ok(!failure.stack.includes(token));assert.ok(!cause.stack.includes(token));
 assert.match(failure.stack,/#render=\[private\]/);assert.match(cause.message,/#workspace=\[private\]/);assert.match(failure.stack,/render.mjs:48/);
 const aggregate=new AggregateError([failure,new Error(message)],message);redactStudioError(aggregate);
 assert.ok(!aggregate.errors[1].stack.includes(token));assert.ok(!aggregate.stack.includes(token));
});
