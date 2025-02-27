/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

/* eslint-disable require-jsdoc */

import { TrzszError, TrzszFileReader, TrzszFileWriter } from "./comm";

class BrowserFileReader implements TrzszFileReader {
  private closed: boolean = false;
  private file: File | null;
  private pos: number = 0;

  constructor(file: File) {
    this.file = file;
  }

  public getName(): string {
    return this.file.name;
  }

  public getSize(): number {
    return this.file.size;
  }

  public async readFile(buf: ArrayBuffer) {
    if (this.pos >= this.file.size) {
      return new Uint8Array(0);
    }
    try {
      const len = Math.min(buf.byteLength, this.file.size - this.pos);
      const chunk = this.file.slice(this.pos, this.pos + len);
      this.pos += len;
      return new Uint8Array(await chunk.arrayBuffer());
    } catch (err) {
      throw new TrzszError(err.toString());
    }
  }

  public closeFile() {
    if (!this.closed) {
      this.file = null;
      this.closed = true;
    }
  }
}

export async function selectSendFiles(): Promise<TrzszFileReader[] | undefined> {
  if (!window.hasOwnProperty("showOpenFilePicker")) {
    throw new TrzszError("The browser doesn't support the File System Access API");
  }

  let fileHandleArray;
  try {
    // @ts-ignore
    fileHandleArray = await window.showOpenFilePicker({ multiple: true });
  } catch (err) {
    if (err.name === "AbortError") {
      return undefined;
    }
    throw err;
  }

  if (!fileHandleArray || !fileHandleArray.length) {
    return undefined;
  }

  const bfrArray: BrowserFileReader[] = [];
  for (const fileHandle of fileHandleArray) {
    bfrArray.push(new BrowserFileReader(await fileHandle.getFile()));
  }
  return bfrArray;
}

class BrowserFileWriter implements TrzszFileWriter {
  private writer; // FileSystemWritableFileStream
  private closed: boolean = false;
  private name: string;

  constructor(name: string, writer) {
    this.name = name;
    this.writer = writer;
  }

  public getName(): string {
    return this.name;
  }

  public async writeFile(buf: Uint8Array) {
    await this.writer.write(buf);
  }

  public closeFile() {
    if (!this.closed) {
      this.writer.close();
      this.writer = null;
      this.closed = true;
    }
  }
}

async function doShowSaveFilePicker(fileName: string) {
  try {
    // @ts-ignore
    return await window.showSaveFilePicker({ suggestedName: fileName });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new TrzszError(err.toString());
    }
    throw err;
  }
}

function isNeedUserPermission(err: Error) {
  return err.name === "SecurityError";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function openSaveFile(requireUserPermission: Function, fileName: string, overwrite: boolean) {
  if (!window.hasOwnProperty("showSaveFilePicker")) {
    throw new TrzszError("The browser doesn't support the File System Access API");
  }

  let fileHandle;
  try {
    fileHandle = await doShowSaveFilePicker(fileName);
  } catch (err) {
    if (!isNeedUserPermission(err)) {
      throw err;
    }

    const authorized = await requireUserPermission(fileName);
    if (!authorized) {
      throw new TrzszError("Cancelled");
    }

    try {
      fileHandle = await doShowSaveFilePicker(fileName);
    } catch (e) {
      if (isNeedUserPermission(e)) {
        throw new TrzszError("No permission to call the File System Access API");
      }
      throw e;
    }
  }

  const file = await fileHandle.getFile();
  const writer = await fileHandle.createWritable();
  return new BrowserFileWriter(file.name, writer);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function defaultRequireUserPermission(fileName: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const div = document.createElement("div");
    div.style.cssText = "position: fixed; left: 0; top: 0; width: 100%; height: 50px; line-height: 50px;";
    div.style.cssText += "text-align: center; background: #28a745; color: #fff;";
    div.innerHTML += "Click anywhere or press the space key to download ";
    const code = document.createElement("code");
    code.style.cssText = "padding: 5px 10px; border-radius: 5px; background: #f9f2f4; color: #c7254e;";
    code.innerHTML += fileName;
    div.appendChild(code);
    document.body.appendChild(div);

    function grantedPermission() {
      div.remove();
      document.removeEventListener("click", grantedPermission);
      document.removeEventListener("keypress", grantedPermission);
      resolve(true);
    }

    document.addEventListener("click", grantedPermission, { once: true });
    document.addEventListener("keypress", grantedPermission, { once: true });
  });
}
