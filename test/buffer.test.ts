/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import { TrzszBuffer } from "../src/buffer";

test("read line after add buffer", async () => {
  const tb = new TrzszBuffer();
  tb.addBuffer("test message\n");
  expect(await tb.readLine()).toBe("test message");
});

test("read line before add buffer", async () => {
  const tb = new TrzszBuffer();
  setTimeout(() => tb.addBuffer("test message\n"), 100);
  expect(await tb.readLine()).toBe("test message");
});

test("read line from two buffer", async () => {
  const tb = new TrzszBuffer();
  tb.addBuffer("test ");
  setTimeout(() => tb.addBuffer("message\n"), 100);
  expect(await tb.readLine()).toBe("test message");
});

test("read lines from mix buffer", async () => {
  const tb = new TrzszBuffer();
  tb.addBuffer("test\nmessage\n");
  expect(await tb.readLine()).toBe("test");
  expect(await tb.readLine()).toBe("message");
});

test("read multiple lines", async () => {
  const tb = new TrzszBuffer();
  tb.addBuffer("1test message1\n");
  tb.addBuffer("2test message2\n");
  expect(await tb.readLine()).toBe("1test message1");
  expect(await tb.readLine()).toBe("2test message2");
  tb.addBuffer("3test message3\n");
  expect(await tb.readLine()).toBe("3test message3");
});

test("read a long line", async () => {
  const tb = new TrzszBuffer();
  const partA = "A".repeat(100);
  const partB = "B".repeat(200);
  const partC = "C".repeat(300);
  tb.addBuffer(partA);
  tb.addBuffer(partB);
  tb.addBuffer(partC);
  setTimeout(() => tb.addBuffer("D\n"), 100);
  expect(await tb.readLine()).toBe(partA + partB + partC + "D");
});

test("read line from blob", async () => {
  const tb = new TrzszBuffer();
  tb.addBuffer(new Blob(["test "]));
  setTimeout(() => tb.addBuffer(new Blob(["message\n"])), 100);
  expect(await tb.readLine()).toBe("test message");
});

test("read line interrupted", async () => {
  const tb = new TrzszBuffer();
  tb.addBuffer("test\x03message\n");
  await expect(tb.readLine()).rejects.toThrowError("Interrupted");
  tb.addBuffer("test\nmessage\x03\n");
  expect(await tb.readLine()).toBe("test");
  await expect(tb.readLine()).rejects.toThrowError("Interrupted");
});

test("read binary after add buffer", async () => {
  const tb = new TrzszBuffer();
  const uint8 = new Uint8Array(300);
  for (let i = 0; i < uint8.length; i++) {
    uint8[i] = i & 0xff;
  }
  tb.addBuffer(uint8.buffer);
  expect(await tb.readBinary(100)).toStrictEqual(uint8.subarray(0, 100));
  expect(await tb.readBinary(200)).toStrictEqual(uint8.subarray(100));
});

test("read binary before add buffer", async () => {
  const tb = new TrzszBuffer();
  const uint8 = new Uint8Array(300);
  for (let i = 0; i < uint8.length; i++) {
    uint8[i] = i & 0xff;
  }
  setTimeout(() => tb.addBuffer(uint8.buffer), 100);
  expect(await tb.readBinary(100)).toStrictEqual(uint8.subarray(0, 100));
  expect(await tb.readBinary(200)).toStrictEqual(uint8.subarray(100));
});

test("read binary from two buffer", async () => {
  const tb = new TrzszBuffer();
  const uint8 = new Uint8Array(200);
  for (let i = 0; i < uint8.length; i++) {
    uint8[i] = i & 0xff;
  }
  tb.addBuffer(uint8.subarray(0, 100));
  setTimeout(() => tb.addBuffer(uint8.buffer.slice(100)), 100);
  expect(await tb.readBinary(200)).toStrictEqual(uint8);
  tb.addBuffer(uint8.buffer);
  expect(await tb.readBinary(200)).toStrictEqual(uint8);
});

test("not support buffer type", async () => {
  const tb = new TrzszBuffer();
  tb.addBuffer(123 as any);
  await expect(tb.readLine()).rejects.toThrowError("not supported");
});

test("stop while reading", async () => {
  const tb = new TrzszBuffer();
  setTimeout(() => tb.stopBuffer(), 100);
  await expect(tb.readLine()).rejects.toThrowError("Stopped");
});
