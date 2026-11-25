/**
 * tests/e2e/harness/webglMock.ts
 *
 * Headless WebGL & WebGL2 context mock satisfying Three.js WebGLRenderer contracts.
 * Provides complete OpenGL constants, shader/program stubs, buffer/texture binding,
 * WebGL2 3D textures, state trackers, and simulated WebGL context loss/restoral lifecycle triggers.
 */

import { HTMLCanvasElementShim, EventShim } from "./domShim";

// GL Constants Map
export const GL_CONSTANTS: Record<string, number> = {
  // Clear buffer bits
  DEPTH_BUFFER_BIT: 0x00000100,
  STENCIL_BUFFER_BIT: 0x00000400,
  COLOR_BUFFER_BIT: 0x00004000,

  // Primitives
  POINTS: 0x0000,
  LINES: 0x0001,
  LINE_LOOP: 0x0002,
  LINE_STRIP: 0x0003,
  TRIANGLES: 0x0004,
  TRIANGLE_STRIP: 0x0005,
  TRIANGLE_FAN: 0x0006,

  // Blending & testing
  ZERO: 0,
  ONE: 1,
  SRC_COLOR: 0x0300,
  ONE_MINUS_SRC_COLOR: 0x0301,
  SRC_ALPHA: 0x0302,
  ONE_MINUS_SRC_ALPHA: 0x0303,
  DST_ALPHA: 0x0304,
  ONE_MINUS_DST_ALPHA: 0x0305,
  DST_COLOR: 0x0306,
  ONE_MINUS_DST_COLOR: 0x0307,
  SRC_ALPHA_SATURATE: 0x0308,

  FUNC_ADD: 0x8006,
  BLEND_EQUATION: 0x8009,
  BLEND_EQUATION_RGB: 0x8009,
  BLEND_EQUATION_ALPHA: 0x883d,
  FUNC_SUBTRACT: 0x800a,
  FUNC_REVERSE_SUBTRACT: 0x800b,
  BLEND_DST_RGB: 0x80c8,
  BLEND_SRC_RGB: 0x80c9,
  BLEND_DST_ALPHA: 0x80ca,
  BLEND_SRC_ALPHA: 0x80cb,
  CONSTANT_COLOR: 0x8001,
  ONE_MINUS_CONSTANT_COLOR: 0x8002,
  CONSTANT_ALPHA: 0x8003,
  ONE_MINUS_CONSTANT_ALPHA: 0x8004,
  BLEND_COLOR: 0x8005,

  // Capabilities
  BLEND: 0x0be2,
  CULL_FACE: 0x0b44,
  DEPTH_TEST: 0x0b71,
  STENCIL_TEST: 0x0b90,
  DITHER: 0x0bd0,
  SCISSOR_TEST: 0x0c11,
  POLYGON_OFFSET_FILL: 0x8037,
  SAMPLE_ALPHA_TO_COVERAGE: 0x809e,
  SAMPLE_COVERAGE: 0x80a0,

  // Comparisons
  NEVER: 0x0200,
  LESS: 0x0201,
  EQUAL: 0x0202,
  LEQUAL: 0x0203,
  GREATER: 0x0204,
  NOTEQUAL: 0x0205,
  GEQUAL: 0x0206,
  ALWAYS: 0x0207,

  // Faces & Winding
  FRONT: 0x0404,
  BACK: 0x0405,
  FRONT_AND_BACK: 0x0408,
  CW: 0x0900,
  CCW: 0x0901,

  // Types
  BYTE: 0x1400,
  UNSIGNED_BYTE: 0x1401,
  SHORT: 0x1402,
  UNSIGNED_SHORT: 0x1403,
  INT: 0x1404,
  UNSIGNED_INT: 0x1405,
  FLOAT: 0x1406,
  HALF_FLOAT: 0x140b,

  // Shaders
  FRAGMENT_SHADER: 0x8b30,
  VERTEX_SHADER: 0x8b31,
  COMPILE_STATUS: 0x8b81,
  LINK_STATUS: 0x8b82,
  VALIDATE_STATUS: 0x8b83,
  DELETE_STATUS: 0x8b80,
  CURRENT_VERTEX_ATTRIB: 0x8626,

  // Buffers
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
  ARRAY_BUFFER_BINDING: 0x8894,
  ELEMENT_ARRAY_BUFFER_BINDING: 0x8895,
  STREAM_DRAW: 0x88e0,
  STATIC_DRAW: 0x88e4,
  DYNAMIC_DRAW: 0x88e8,

  // Textures
  TEXTURE_2D: 0x0de1,
  TEXTURE_CUBE_MAP: 0x8513,
  TEXTURE_BINDING_2D: 0x8069,
  TEXTURE_BINDING_CUBE_MAP: 0x8514,
  TEXTURE_CUBE_MAP_POSITIVE_X: 0x8515,
  TEXTURE_CUBE_MAP_NEGATIVE_X: 0x8516,
  TEXTURE_CUBE_MAP_POSITIVE_Y: 0x8517,
  TEXTURE_CUBE_MAP_NEGATIVE_Y: 0x8518,
  TEXTURE_CUBE_MAP_POSITIVE_Z: 0x8519,
  TEXTURE_CUBE_MAP_NEGATIVE_Z: 0x851a,
  MAX_CUBE_MAP_TEXTURE_SIZE: 0x851c,
  TEXTURE0: 0x84c0,
  ACTIVE_TEXTURE: 0x84e0,
  REPEAT: 0x2901,
  CLAMP_TO_EDGE: 0x812f,
  MIRRORED_REPEAT: 0x8370,
  TEXTURE_MAG_FILTER: 0x2800,
  TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_WRAP_S: 0x2802,
  TEXTURE_WRAP_T: 0x2803,
  TEXTURE_WRAP_R: 0x8072,
  NEAREST: 0x2600,
  LINEAR: 0x2601,
  NEAREST_MIPMAP_NEAREST: 0x2700,
  LINEAR_MIPMAP_NEAREST: 0x2701,
  NEAREST_MIPMAP_LINEAR: 0x2702,
  LINEAR_MIPMAP_LINEAR: 0x2703,

  // WebGL2 Textures
  TEXTURE_3D: 0x806f,
  TEXTURE_2D_ARRAY: 0x8c1a,
  TEXTURE_BINDING_3D: 0x806a,
  TEXTURE_BINDING_2D_ARRAY: 0x8c1d,

  // Pixel formats
  ALPHA: 0x1906,
  RGB: 0x1907,
  RGBA: 0x1908,
  LUMINANCE: 0x1909,
  LUMINANCE_ALPHA: 0x190a,
  DEPTH_COMPONENT: 0x1902,
  DEPTH_STENCIL: 0x84f9,

  // Framebuffer / Renderbuffer
  FRAMEBUFFER: 0x8d40,
  RENDERBUFFER: 0x8d41,
  RGBA4: 0x8056,
  RGB5_A1: 0x8057,
  RGB565: 0x8d62,
  DEPTH_COMPONENT16: 0x81a5,
  STENCIL_INDEX8: 0x8d48,
  DEPTH_STENCIL_ATTACHMENT: 0x821a,
  COLOR_ATTACHMENT0: 0x8ce0,
  DEPTH_ATTACHMENT: 0x8d00,
  STENCIL_ATTACHMENT: 0x8d20,
  FRAMEBUFFER_COMPLETE: 0x8cd5,
  FRAMEBUFFER_INCOMPLETE_ATTACHMENT: 0x8cd6,
  FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: 0x8cd7,
  FRAMEBUFFER_INCOMPLETE_DIMENSIONS: 0x8cd9,
  FRAMEBUFFER_UNSUPPORTED: 0x8cdd,

  // Parameters & limits
  VENDOR: 0x1f00,
  RENDERER: 0x1f01,
  VERSION: 0x1f02,
  SHADING_LANGUAGE_VERSION: 0x8b8c,
  MAX_VERTEX_ATTRIBS: 0x8869,
  MAX_VERTEX_UNIFORM_VECTORS: 0x8dfb,
  MAX_VARYING_VECTORS: 0x8dfc,
  MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
  MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8b4c,
  MAX_TEXTURE_IMAGE_UNITS: 0x8872,
  MAX_TEXTURE_SIZE: 0x0d33,
  MAX_RENDERBUFFER_SIZE: 0x84e8,
  MAX_VIEWPORT_DIMS: 0x0d3a,
  ALIASED_LINE_WIDTH_RANGE: 0x846e,
  ALIASED_POINT_SIZE_RANGE: 0x846d,
  MAX_SAMPLES: 0x8d57,
  MAX_DRAW_BUFFERS: 0x8824,
  VIEWPORT: 0x0ba2,
  SCISSOR_BOX: 0x0c10,
  IMPLEMENTATION_COLOR_READ_FORMAT: 0x8b9b,
  IMPLEMENTATION_COLOR_READ_TYPE: 0x8b9c,

  // Precision
  LOW_FLOAT: 0x8df0,
  MEDIUM_FLOAT: 0x8df1,
  HIGH_FLOAT: 0x8df2,
  LOW_INT: 0x8df3,
  MEDIUM_INT: 0x8df4,
  HIGH_INT: 0x8df5,

  // Errors & Unpack
  NO_ERROR: 0,
  INVALID_ENUM: 0x0500,
  INVALID_VALUE: 0x0501,
  INVALID_OPERATION: 0x0502,
  OUT_OF_MEMORY: 0x0505,
  CONTEXT_LOST_WEBGL: 0x9242,
  UNPACK_FLIP_Y_WEBGL: 0x9240,
  UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
  UNPACK_ALIGNMENT: 0x0cf5,
};

export class WebGLMockContext {
  public canvas: HTMLCanvasElementShim;
  public isWebGL2: boolean;
  private _contextLost = false;

  // Telemetry & Assertions
  public drawCalls = 0;
  public clearCalls = 0;
  public createdShaders = 0;
  public createdPrograms = 0;
  public createdBuffers = 0;
  public createdTextures = 0;

  // State caches
  private enabledCaps = new Set<number>();
  private activeTex = 0;
  private currentProgram: any = null;
  private currentVao: any = null;
  private currentArrayBuffer: any = null;
  private currentElementArrayBuffer: any = null;
  private idSequence = 1;

  constructor(canvas: HTMLCanvasElementShim, isWebGL2 = true) {
    this.canvas = canvas;
    this.isWebGL2 = isWebGL2;

    // Populate all OpenGL constants directly on the context instance
    for (const [key, value] of Object.entries(GL_CONSTANTS)) {
      (this as any)[key] = value;
    }
  }

  resetStats(): void {
    this.drawCalls = 0;
    this.clearCalls = 0;
    this.createdShaders = 0;
    this.createdPrograms = 0;
    this.createdBuffers = 0;
    this.createdTextures = 0;
  }

  // --- Context Attributes & Extensions ---

  getContextAttributes(): Record<string, any> {
    return {
      alpha: true,
      depth: true,
      stencil: true,
      antialias: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "default",
      failIfMajorPerformanceCaveat: false,
    };
  }

  isContextLost(): boolean {
    return this._contextLost;
  }

  simulateContextLoss(): void {
    if (this._contextLost) return;
    this._contextLost = true;
    const evt = new EventShim("webglcontextlost", { cancelable: true });
    this.canvas.dispatchEvent(evt);
  }

  simulateContextRestored(): void {
    if (!this._contextLost) return;
    this._contextLost = false;
    const evt = new EventShim("webglcontextrestored", { cancelable: false });
    this.canvas.dispatchEvent(evt);
  }

  getExtension(name: string): any {
    const ext = name.toLowerCase();
    if (ext === "oes_texture_float" || ext === "oes_texture_half_float") {
      return {};
    }
    if (ext === "angle_instanced_arrays") {
      return {
        drawArraysInstancedANGLE: (m: any, f: any, c: any, i: any) => this.drawArraysInstanced(m, f, c, i),
        drawElementsInstancedANGLE: (m: any, c: any, t: any, o: any, i: any) => this.drawElementsInstanced(m, c, t, o, i),
        vertexAttribDivisorANGLE: () => {},
      };
    }
    if (ext === "oes_vertex_array_object") {
      return {
        createVertexArrayOES: () => this.createVertexArray(),
        bindVertexArrayOES: (vao: any) => this.bindVertexArray(vao),
        deleteVertexArrayOES: (vao: any) => this.deleteVertexArray(vao),
      };
    }
    if (ext === "ext_blend_minmax" || ext === "oes_element_index_uint" || ext === "webgl_depth_texture") {
      return {};
    }
    if (ext === "ext_texture_filter_anisotropic") {
      return {
        MAX_TEXTURE_MAX_ANISOTROPY_EXT: 0x84ff,
      };
    }
    return {};
  }

  getSupportedExtensions(): string[] {
    return [
      "ANGLE_instanced_arrays",
      "EXT_blend_minmax",
      "EXT_color_buffer_float",
      "EXT_color_buffer_half_float",
      "EXT_float_blend",
      "EXT_texture_filter_anisotropic",
      "OES_element_index_uint",
      "OES_standard_derivatives",
      "OES_texture_float",
      "OES_texture_half_float",
      "OES_vertex_array_object",
      "WEBGL_depth_texture",
      "WEBGL_draw_buffers",
    ];
  }

  getParameter(pname: number): any {
    switch (pname) {
      case GL_CONSTANTS.MAX_TEXTURE_SIZE:
        return 4096;
      case GL_CONSTANTS.MAX_CUBE_MAP_TEXTURE_SIZE:
        return 4096;
      case GL_CONSTANTS.MAX_VERTEX_ATTRIBS:
        return 16;
      case GL_CONSTANTS.MAX_VERTEX_UNIFORM_VECTORS:
        return 256;
      case GL_CONSTANTS.MAX_VARYING_VECTORS:
        return 16;
      case GL_CONSTANTS.MAX_FRAGMENT_UNIFORM_VECTORS:
        return 256;
      case GL_CONSTANTS.MAX_COMBINED_TEXTURE_IMAGE_UNITS:
        return 32;
      case GL_CONSTANTS.MAX_VERTEX_TEXTURE_IMAGE_UNITS:
        return 16;
      case GL_CONSTANTS.MAX_TEXTURE_IMAGE_UNITS:
        return 16;
      case GL_CONSTANTS.MAX_SAMPLES:
        return 4;
      case GL_CONSTANTS.MAX_DRAW_BUFFERS:
        return 8;
      case GL_CONSTANTS.VIEWPORT:
        return new Int32Array([0, 0, this.canvas.width || 800, this.canvas.height || 600]);
      case GL_CONSTANTS.SCISSOR_BOX:
        return new Int32Array([0, 0, this.canvas.width || 800, this.canvas.height || 600]);
      case GL_CONSTANTS.IMPLEMENTATION_COLOR_READ_FORMAT:
        return GL_CONSTANTS.RGBA;
      case GL_CONSTANTS.IMPLEMENTATION_COLOR_READ_TYPE:
        return GL_CONSTANTS.UNSIGNED_BYTE;
      case GL_CONSTANTS.MAX_VIEWPORT_DIMS:
        return new Int32Array([4096, 4096]);
      case GL_CONSTANTS.ALIASED_LINE_WIDTH_RANGE:
        return new Float32Array([1, 1]);
      case GL_CONSTANTS.ALIASED_POINT_SIZE_RANGE:
        return new Float32Array([1, 1024]);
      case GL_CONSTANTS.VERSION:
        return this.isWebGL2 ? "WebGL 2.0 (Headless Mock)" : "WebGL 1.0 (Headless Mock)";
      case GL_CONSTANTS.SHADING_LANGUAGE_VERSION:
        return this.isWebGL2 ? "WebGL GLSL ES 3.00 (Headless Mock)" : "WebGL GLSL ES 1.00 (Headless Mock)";
      case GL_CONSTANTS.VENDOR:
        return "BarmoHeadless Inc.";
      case GL_CONSTANTS.RENDERER:
        return "Barmo Virtual WebGL Engine";
      default:
        return 0;
    }
  }

  getShaderPrecisionFormat(shadertype: number, precisiontype: number): { rangeMin: number; rangeMax: number; precision: number } {
    return {
      rangeMin: 127,
      rangeMax: 127,
      precision: 23,
    };
  }

  // --- Shaders & Programs ---

  createShader(type: number): any {
    this.createdShaders++;
    return {
      id: this.idSequence++,
      type,
      source: "",
      compiled: false,
    };
  }

  shaderSource(shader: any, source: string): void {
    if (shader) shader.source = source;
  }

  compileShader(shader: any): void {
    if (shader) shader.compiled = true;
  }

  getShaderParameter(shader: any, pname: number): any {
    if (pname === GL_CONSTANTS.COMPILE_STATUS) return true;
    if (pname === GL_CONSTANTS.DELETE_STATUS) return false;
    return 0;
  }

  getShaderInfoLog(shader: any): string {
    return "";
  }

  deleteShader(shader: any): void {}

  createProgram(): any {
    this.createdPrograms++;
    return {
      id: this.idSequence++,
      shaders: [],
      linked: false,
      uniforms: new Map<string, any>(),
      attribs: new Map<string, number>(),
    };
  }

  attachShader(program: any, shader: any): void {
    if (program && shader) program.shaders.push(shader);
  }

  detachShader(program: any, shader: any): void {}

  linkProgram(program: any): void {
    if (program) program.linked = true;
  }

  getProgramParameter(program: any, pname: number): any {
    if (pname === GL_CONSTANTS.LINK_STATUS) return true;
    if (pname === GL_CONSTANTS.VALIDATE_STATUS) return true;
    if (pname === GL_CONSTANTS.ACTIVE_UNIFORMS) return 0;
    if (pname === GL_CONSTANTS.ACTIVE_ATTRIBUTES) return 0;
    return 0;
  }

  getProgramInfoLog(program: any): string {
    return "";
  }

  useProgram(program: any): void {
    this.currentProgram = program;
  }

  deleteProgram(program: any): void {
    if (this.currentProgram === program) this.currentProgram = null;
  }

  getAttribLocation(program: any, name: string): number {
    if (!program) return -1;
    if (!program.attribs.has(name)) {
      program.attribs.set(name, program.attribs.size);
    }
    return program.attribs.get(name)!;
  }

  getUniformLocation(program: any, name: string): any {
    if (!program) return null;
    return { programId: program.id, name, id: this.idSequence++ };
  }

  getActiveAttrib(program: any, index: number): any {
    return null;
  }

  getActiveUniform(program: any, index: number): any {
    return null;
  }

  // Uniform Setters
  uniform1f(loc: any, v0: number): void {}
  uniform1fv(loc: any, val: any): void {}
  uniform1i(loc: any, v0: number): void {}
  uniform1iv(loc: any, val: any): void {}
  uniform2f(loc: any, v0: number, v1: number): void {}
  uniform2fv(loc: any, val: any): void {}
  uniform2i(loc: any, v0: number, v1: number): void {}
  uniform2iv(loc: any, val: any): void {}
  uniform3f(loc: any, v0: number, v1: number, v2: number): void {}
  uniform3fv(loc: any, val: any): void {}
  uniform3i(loc: any, v0: number, v1: number, v2: number): void {}
  uniform3iv(loc: any, val: any): void {}
  uniform4f(loc: any, v0: number, v1: number, v2: number, v3: number): void {}
  uniform4fv(loc: any, val: any): void {}
  uniform4i(loc: any, v0: number, v1: number, v2: number, v3: number): void {}
  uniform4iv(loc: any, val: any): void {}
  uniformMatrix2fv(loc: any, transpose: boolean, val: any): void {}
  uniformMatrix3fv(loc: any, transpose: boolean, val: any): void {}
  uniformMatrix4fv(loc: any, transpose: boolean, val: any): void {}

  // --- Buffers & VAO ---

  createBuffer(): any {
    this.createdBuffers++;
    return { id: this.idSequence++, target: 0, data: null };
  }

  bindBuffer(target: number, buffer: any): void {
    if (target === GL_CONSTANTS.ARRAY_BUFFER) this.currentArrayBuffer = buffer;
    if (target === GL_CONSTANTS.ELEMENT_ARRAY_BUFFER) this.currentElementArrayBuffer = buffer;
  }

  bufferData(target: number, data: any, usage: number): void {
    const buf = target === GL_CONSTANTS.ARRAY_BUFFER ? this.currentArrayBuffer : this.currentElementArrayBuffer;
    if (buf) {
      buf.data = data;
      buf.usage = usage;
    }
  }

  bufferSubData(target: number, offset: number, data: any): void {}

  deleteBuffer(buffer: any): void {}

  createVertexArray(): any {
    return { id: this.idSequence++, attribs: [] };
  }

  bindVertexArray(vao: any): void {
    this.currentVao = vao;
  }

  deleteVertexArray(vao: any): void {
    if (this.currentVao === vao) this.currentVao = null;
  }

  enableVertexAttribArray(index: number): void {}
  disableVertexAttribArray(index: number): void {}
  vertexAttribPointer(index: number, size: number, type: number, normalized: boolean, stride: number, offset: number): void {}
  vertexAttribIPointer(index: number, size: number, type: number, stride: number, offset: number): void {}
  vertexAttribDivisor(index: number, divisor: number): void {}

  // --- Textures ---

  createTexture(): any {
    this.createdTextures++;
    return { id: this.idSequence++, target: 0, params: {} };
  }

  bindTexture(target: number, texture: any): void {}

  activeTexture(textureUnit: number): void {
    this.activeTex = textureUnit;
  }

  texParameteri(target: number, pname: number, param: number): void {}
  texParameterf(target: number, pname: number, param: number): void {}

  texImage2D(...args: any[]): void {}
  texSubImage2D(...args: any[]): void {}

  texImage3D(...args: any[]): void {}
  texSubImage3D(...args: any[]): void {}
  texStorage2D(...args: any[]): void {}
  texStorage3D(...args: any[]): void {}

  generateMipmap(target: number): void {}
  deleteTexture(texture: any): void {}

  // --- Renderbuffers & Framebuffers ---

  createFramebuffer(): any {
    return { id: this.idSequence++ };
  }

  bindFramebuffer(target: number, fb: any): void {}
  framebufferTexture2D(target: number, attachment: number, textarget: number, texture: any, level: number): void {}
  framebufferTextureLayer(target: number, attachment: number, texture: any, level: number, layer: number): void {}
  framebufferRenderbuffer(target: number, attachment: number, renderbuffertarget: number, renderbuffer: any): void {}
  checkFramebufferStatus(target: number): number {
    return GL_CONSTANTS.FRAMEBUFFER_COMPLETE;
  }
  deleteFramebuffer(fb: any): void {}

  createRenderbuffer(): any {
    return { id: this.idSequence++ };
  }

  bindRenderbuffer(target: number, rb: any): void {}
  renderbufferStorage(target: number, internalformat: number, width: number, height: number): void {}
  renderbufferStorageMultisample(target: number, samples: number, internalformat: number, width: number, height: number): void {}
  deleteRenderbuffer(rb: any): void {}

  drawBuffers(buffers: number[]): void {}
  readBuffer(src: number): void {}
  blitFramebuffer(...args: any[]): void {}

  // --- State, Viewport & Clear ---

  enable(cap: number): void {
    this.enabledCaps.add(cap);
  }

  disable(cap: number): void {
    this.enabledCaps.delete(cap);
  }

  isEnabled(cap: number): boolean {
    return this.enabledCaps.has(cap);
  }

  viewport(x: number, y: number, width: number, height: number): void {}
  scissor(x: number, y: number, width: number, height: number): void {}

  clearColor(r: number, g: number, b: number, a: number): void {}
  clearDepth(depth: number): void {}
  clearStencil(s: number): void {}

  clear(mask: number): void {
    this.clearCalls++;
  }

  colorMask(r: boolean, g: boolean, b: boolean, a: boolean): void {}
  depthMask(flag: boolean): void {}
  depthFunc(func: number): void {}

  blendFunc(sfactor: number, dfactor: number): void {}
  blendFuncSeparate(srcRGB: number, dstRGB: number, srcAlpha: number, dstAlpha: number): void {}
  blendEquation(mode: number): void {}
  blendEquationSeparate(modeRGB: number, modeAlpha: number): void {}

  cullFace(mode: number): void {}
  frontFace(mode: number): void {}
  pixelStorei(pname: number, param: number): void {}
  readPixels(x: number, y: number, width: number, height: number, format: number, type: number, pixels: any): void {}

  // --- Stencil & Depth ---

  stencilMask(mask: number): void {}
  stencilFunc(func: number, ref: number, mask: number): void {}
  stencilOp(fail: number, zfail: number, zpass: number): void {}
  stencilMaskSeparate(face: number, mask: number): void {}
  stencilFuncSeparate(face: number, func: number, ref: number, mask: number): void {}
  stencilOpSeparate(face: number, fail: number, zfail: number, zpass: number): void {}

  lineWidth(width: number): void {}
  polygonOffset(factor: number, units: number): void {}

  // --- Draw Calls ---

  drawArrays(mode: number, first: number, count: number): void {
    this.drawCalls++;
  }

  drawElements(mode: number, count: number, type: number, offset: number): void {
    this.drawCalls++;
  }

  drawArraysInstanced(mode: number, first: number, count: number, instanceCount: number): void {
    this.drawCalls++;
  }

  drawElementsInstanced(mode: number, count: number, type: number, offset: number, instanceCount: number): void {
    this.drawCalls++;
  }

  finish(): void {}
  flush(): void {}
}

export function createMockWebGLContext(canvas: HTMLCanvasElementShim, contextType: string): WebGLMockContext {
  const isWebGL2 = contextType === "webgl2";
  return new WebGLMockContext(canvas, isWebGL2);
}

export function installWebGLMock(): void {
  (HTMLCanvasElementShim as any)._contextFactory = (canvas: HTMLCanvasElementShim, type: string) => {
    if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") {
      return createMockWebGLContext(canvas, type);
    }
    return null;
  };

  (globalThis as any).WebGLRenderingContext = WebGLMockContext;
  (globalThis as any).WebGL2RenderingContext = WebGLMockContext;
}

export function cleanupWebGLMock(): void {
  delete (HTMLCanvasElementShim as any)._contextFactory;
  delete (globalThis as any).WebGLRenderingContext;
  delete (globalThis as any).WebGL2RenderingContext;
}
