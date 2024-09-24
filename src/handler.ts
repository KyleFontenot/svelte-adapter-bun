// @bun
// import {
//   mime_conf_default
// } from "./mime.conf.js";

const mimedefault = {
  exe: 'application/octet-stream',
};

// export default mimes;

import { manifest } from 'MANIFEST';
// src/handler.js
import { Server } from 'SERVER';
//
// src/env.js
function env(name, fallback) {
  const prefixed = ENV_PREFIX + name;
  return prefixed in Bun.env ? Bun.env[prefixed] : fallback;
}
const expected = new Set([
  'HOST',
  'PORT',
  'ORIGIN',
  'XFF_DEPTH',
  'ADDRESS_HEADER',
  'PROTOCOL_HEADER',
  'HOST_HEADER',
  'SERVERDEV',
]);
const buildOptions = BUILD_OPTIONS;
if (ENV_PREFIX) {
  for (const name in Bun.env) {
    if (name.startsWith(ENV_PREFIX)) {
      const unprefixed = name.slice(ENV_PREFIX.length);
      if (!expected.has(unprefixed)) {
        throw new Error(
          `You should change envPrefix (${ENV_PREFIX}) to avoid conflicts with existing environment variables \u2014 unexpectedly saw ${name}`,
        );
      }
    }
  }
}

// src/handler.js
const { fileURLToPath } = globalThis.Bun;
import path from 'node:path';

// src/sirv.js
import { existsSync, statSync as statSync2 } from 'node:fs';
import { join as join2, normalize, resolve as resolve2 } from 'node:path';

// node_modules/mrmime/index.mjs
function lookup(extn) {
  const tmp = extn.toString().trim().toLowerCase();
  let idx = tmp.lastIndexOf('.');
  return mimes[!~idx ? tmp : tmp.substring(++idx)];
}
const mimes = {
  ez: 'application/andrew-inset',
  aw: 'application/applixware',
  atom: 'application/atom+xml',
  atomcat: 'application/atomcat+xml',
  atomdeleted: 'application/atomdeleted+xml',
  atomsvc: 'application/atomsvc+xml',
  dwd: 'application/atsc-dwd+xml',
  held: 'application/atsc-held+xml',
  rsat: 'application/atsc-rsat+xml',
  bdoc: 'application/bdoc',
  xcs: 'application/calendar+xml',
  ccxml: 'application/ccxml+xml',
  cdfx: 'application/cdfx+xml',
  cdmia: 'application/cdmi-capability',
  cdmic: 'application/cdmi-container',
  cdmid: 'application/cdmi-domain',
  cdmio: 'application/cdmi-object',
  cdmiq: 'application/cdmi-queue',
  cu: 'application/cu-seeme',
  mpd: 'application/dash+xml',
  davmount: 'application/davmount+xml',
  dbk: 'application/docbook+xml',
  dssc: 'application/dssc+der',
  xdssc: 'application/dssc+xml',
  es: 'application/ecmascript',
  ecma: 'application/ecmascript',
  emma: 'application/emma+xml',
  emotionml: 'application/emotionml+xml',
  epub: 'application/epub+zip',
  exi: 'application/exi',
  fdt: 'application/fdt+xml',
  pfr: 'application/font-tdpfr',
  geojson: 'application/geo+json',
  gml: 'application/gml+xml',
  gpx: 'application/gpx+xml',
  gxf: 'application/gxf',
  gz: 'application/gzip',
  hjson: 'application/hjson',
  stk: 'application/hyperstudio',
  ink: 'application/inkml+xml',
  inkml: 'application/inkml+xml',
  ipfix: 'application/ipfix',
  its: 'application/its+xml',
  jar: 'application/java-archive',
  war: 'application/java-archive',
  ear: 'application/java-archive',
  ser: 'application/java-serialized-object',
  class: 'application/java-vm',
  js: 'application/javascript',
  mjs: 'application/javascript',
  json: 'application/json',
  map: 'application/json',
  json5: 'application/json5',
  jsonml: 'application/jsonml+json',
  jsonld: 'application/ld+json',
  lgr: 'application/lgr+xml',
  lostxml: 'application/lost+xml',
  hqx: 'application/mac-binhex40',
  cpt: 'application/mac-compactpro',
  mads: 'application/mads+xml',
  webmanifest: 'application/manifest+json',
  mrc: 'application/marc',
  mrcx: 'application/marcxml+xml',
  ma: 'application/mathematica',
  nb: 'application/mathematica',
  mb: 'application/mathematica',
  mathml: 'application/mathml+xml',
  mbox: 'application/mbox',
  mscml: 'application/mediaservercontrol+xml',
  metalink: 'application/metalink+xml',
  meta4: 'application/metalink4+xml',
  mets: 'application/mets+xml',
  maei: 'application/mmt-aei+xml',
  musd: 'application/mmt-usd+xml',
  mods: 'application/mods+xml',
  m21: 'application/mp21',
  mp21: 'application/mp21',
  mp4s: 'application/mp4',
  m4p: 'application/mp4',
  doc: 'application/msword',
  dot: 'application/msword',
  mxf: 'application/mxf',
  nq: 'application/n-quads',
  nt: 'application/n-triples',
  cjs: 'application/node',
  bin: 'application/octet-stream',
  dms: 'application/octet-stream',
  lrf: 'application/octet-stream',
  mar: 'application/octet-stream',
  so: 'application/octet-stream',
  dist: 'application/octet-stream',
  distz: 'application/octet-stream',
  pkg: 'application/octet-stream',
  bpk: 'application/octet-stream',
  dump: 'application/octet-stream',
  elc: 'application/octet-stream',
  deploy: 'application/octet-stream',
  exe: 'application/octet-stream',
  dll: 'application/octet-stream',
  deb: 'application/octet-stream',
  dmg: 'application/octet-stream',
  iso: 'application/octet-stream',
  img: 'application/octet-stream',
  msi: 'application/octet-stream',
  msp: 'application/octet-stream',
  msm: 'application/octet-stream',
  buffer: 'application/octet-stream',
  oda: 'application/oda',
  opf: 'application/oebps-package+xml',
  ogx: 'application/ogg',
  omdoc: 'application/omdoc+xml',
  onetoc: 'application/onenote',
  onetoc2: 'application/onenote',
  onetmp: 'application/onenote',
  onepkg: 'application/onenote',
  oxps: 'application/oxps',
  relo: 'application/p2p-overlay+xml',
  xer: 'application/patch-ops-error+xml',
  pdf: 'application/pdf',
  pgp: 'application/pgp-encrypted',
  asc: 'application/pgp-signature',
  sig: 'application/pgp-signature',
  prf: 'application/pics-rules',
  p10: 'application/pkcs10',
  p7m: 'application/pkcs7-mime',
  p7c: 'application/pkcs7-mime',
  p7s: 'application/pkcs7-signature',
  p8: 'application/pkcs8',
  ac: 'application/pkix-attr-cert',
  cer: 'application/pkix-cert',
  crl: 'application/pkix-crl',
  pkipath: 'application/pkix-pkipath',
  pki: 'application/pkixcmp',
  pls: 'application/pls+xml',
  ai: 'application/postscript',
  eps: 'application/postscript',
  ps: 'application/postscript',
  provx: 'application/provenance+xml',
  cww: 'application/prs.cww',
  pskcxml: 'application/pskc+xml',
  raml: 'application/raml+yaml',
  rdf: 'application/rdf+xml',
  owl: 'application/rdf+xml',
  rif: 'application/reginfo+xml',
  rnc: 'application/relax-ng-compact-syntax',
  rl: 'application/resource-lists+xml',
  rld: 'application/resource-lists-diff+xml',
  rs: 'application/rls-services+xml',
  rapd: 'application/route-apd+xml',
  sls: 'application/route-s-tsid+xml',
  rusd: 'application/route-usd+xml',
  gbr: 'application/rpki-ghostbusters',
  mft: 'application/rpki-manifest',
  roa: 'application/rpki-roa',
  rsd: 'application/rsd+xml',
  rss: 'application/rss+xml',
  rtf: 'application/rtf',
  sbml: 'application/sbml+xml',
  scq: 'application/scvp-cv-request',
  scs: 'application/scvp-cv-response',
  spq: 'application/scvp-vp-request',
  spp: 'application/scvp-vp-response',
  sdp: 'application/sdp',
  senmlx: 'application/senml+xml',
  sensmlx: 'application/sensml+xml',
  setpay: 'application/set-payment-initiation',
  setreg: 'application/set-registration-initiation',
  shf: 'application/shf+xml',
  siv: 'application/sieve',
  sieve: 'application/sieve',
  smi: 'application/smil+xml',
  smil: 'application/smil+xml',
  rq: 'application/sparql-query',
  srx: 'application/sparql-results+xml',
  gram: 'application/srgs',
  grxml: 'application/srgs+xml',
  sru: 'application/sru+xml',
  ssdl: 'application/ssdl+xml',
  ssml: 'application/ssml+xml',
  swidtag: 'application/swid+xml',
  tei: 'application/tei+xml',
  teicorpus: 'application/tei+xml',
  tfi: 'application/thraud+xml',
  tsd: 'application/timestamped-data',
  toml: 'application/toml',
  trig: 'application/trig',
  ttml: 'application/ttml+xml',
  ubj: 'application/ubjson',
  rsheet: 'application/urc-ressheet+xml',
  td: 'application/urc-targetdesc+xml',
  vxml: 'application/voicexml+xml',
  wasm: 'application/wasm',
  wgt: 'application/widget',
  hlp: 'application/winhlp',
  wsdl: 'application/wsdl+xml',
  wspolicy: 'application/wspolicy+xml',
  xaml: 'application/xaml+xml',
  xav: 'application/xcap-att+xml',
  xca: 'application/xcap-caps+xml',
  xdf: 'application/xcap-diff+xml',
  xel: 'application/xcap-el+xml',
  xns: 'application/xcap-ns+xml',
  xenc: 'application/xenc+xml',
  xhtml: 'application/xhtml+xml',
  xht: 'application/xhtml+xml',
  xlf: 'application/xliff+xml',
  xml: 'application/xml',
  xsl: 'application/xml',
  xsd: 'application/xml',
  rng: 'application/xml',
  dtd: 'application/xml-dtd',
  xop: 'application/xop+xml',
  xpl: 'application/xproc+xml',
  xslt: 'application/xml',
  xspf: 'application/xspf+xml',
  mxml: 'application/xv+xml',
  xhvml: 'application/xv+xml',
  xvml: 'application/xv+xml',
  xvm: 'application/xv+xml',
  yang: 'application/yang',
  yin: 'application/yin+xml',
  zip: 'application/zip',
  '3gpp': 'video/3gpp',
  adp: 'audio/adpcm',
  amr: 'audio/amr',
  au: 'audio/basic',
  snd: 'audio/basic',
  mid: 'audio/midi',
  midi: 'audio/midi',
  kar: 'audio/midi',
  rmi: 'audio/midi',
  mxmf: 'audio/mobile-xmf',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4a: 'audio/mp4',
  mpga: 'audio/mpeg',
  mp2: 'audio/mpeg',
  mp2a: 'audio/mpeg',
  m2a: 'audio/mpeg',
  m3a: 'audio/mpeg',
  oga: 'audio/ogg',
  ogg: 'audio/ogg',
  spx: 'audio/ogg',
  opus: 'audio/ogg',
  s3m: 'audio/s3m',
  sil: 'audio/silk',
  wav: 'audio/wav',
  weba: 'audio/webm',
  xm: 'audio/xm',
  ttc: 'font/collection',
  otf: 'font/otf',
  ttf: 'font/ttf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  exr: 'image/aces',
  apng: 'image/apng',
  avif: 'image/avif',
  bmp: 'image/bmp',
  cgm: 'image/cgm',
  drle: 'image/dicom-rle',
  emf: 'image/emf',
  fits: 'image/fits',
  g3: 'image/g3fax',
  gif: 'image/gif',
  heic: 'image/heic',
  heics: 'image/heic-sequence',
  heif: 'image/heif',
  heifs: 'image/heif-sequence',
  hej2: 'image/hej2k',
  hsj2: 'image/hsj2',
  ief: 'image/ief',
  jls: 'image/jls',
  jp2: 'image/jp2',
  jpg2: 'image/jp2',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  jpe: 'image/jpeg',
  jph: 'image/jph',
  jhc: 'image/jphc',
  jpm: 'image/jpm',
  jpx: 'image/jpx',
  jpf: 'image/jpx',
  jxr: 'image/jxr',
  jxra: 'image/jxra',
  jxrs: 'image/jxrs',
  jxs: 'image/jxs',
  jxsc: 'image/jxsc',
  jxsi: 'image/jxsi',
  jxss: 'image/jxss',
  ktx: 'image/ktx',
  ktx2: 'image/ktx2',
  png: 'image/png',
  btif: 'image/prs.btif',
  pti: 'image/prs.pti',
  sgi: 'image/sgi',
  svg: 'image/svg+xml',
  svgz: 'image/svg+xml',
  t38: 'image/t38',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  tfx: 'image/tiff-fx',
  webp: 'image/webp',
  wmf: 'image/wmf',
  'disposition-notification': 'message/disposition-notification',
  u8msg: 'message/global',
  u8dsn: 'message/global-delivery-status',
  u8mdn: 'message/global-disposition-notification',
  u8hdr: 'message/global-headers',
  eml: 'message/rfc822',
  mime: 'message/rfc822',
  '3mf': 'model/3mf',
  gltf: 'model/gltf+json',
  glb: 'model/gltf-binary',
  igs: 'model/iges',
  iges: 'model/iges',
  msh: 'model/mesh',
  mesh: 'model/mesh',
  silo: 'model/mesh',
  mtl: 'model/mtl',
  obj: 'model/obj',
  stpz: 'model/step+zip',
  stpxz: 'model/step-xml+zip',
  stl: 'model/stl',
  wrl: 'model/vrml',
  vrml: 'model/vrml',
  x3db: 'model/x3d+fastinfoset',
  x3dbz: 'model/x3d+binary',
  x3dv: 'model/x3d-vrml',
  x3dvz: 'model/x3d+vrml',
  x3d: 'model/x3d+xml',
  x3dz: 'model/x3d+xml',
  appcache: 'text/cache-manifest',
  manifest: 'text/cache-manifest',
  ics: 'text/calendar',
  ifb: 'text/calendar',
  coffee: 'text/coffeescript',
  litcoffee: 'text/coffeescript',
  css: 'text/css',
  csv: 'text/csv',
  html: 'text/html',
  htm: 'text/html',
  shtml: 'text/html',
  jade: 'text/jade',
  jsx: 'text/jsx',
  less: 'text/less',
  markdown: 'text/markdown',
  md: 'text/markdown',
  mml: 'text/mathml',
  mdx: 'text/mdx',
  n3: 'text/n3',
  txt: 'text/plain',
  text: 'text/plain',
  conf: 'text/plain',
  def: 'text/plain',
  list: 'text/plain',
  log: 'text/plain',
  in: 'text/plain',
  ini: 'text/plain',
  dsc: 'text/prs.lines.tag',
  rtx: 'text/richtext',
  sgml: 'text/sgml',
  sgm: 'text/sgml',
  shex: 'text/shex',
  slim: 'text/slim',
  slm: 'text/slim',
  spdx: 'text/spdx',
  stylus: 'text/stylus',
  styl: 'text/stylus',
  tsv: 'text/tab-separated-values',
  t: 'text/troff',
  tr: 'text/troff',
  roff: 'text/troff',
  man: 'text/troff',
  me: 'text/troff',
  ms: 'text/troff',
  ttl: 'text/turtle',
  uri: 'text/uri-list',
  uris: 'text/uri-list',
  urls: 'text/uri-list',
  vcard: 'text/vcard',
  vtt: 'text/vtt',
  yaml: 'text/yaml',
  yml: 'text/yaml',
  '3gp': 'video/3gpp',
  '3g2': 'video/3gpp2',
  h261: 'video/h261',
  h263: 'video/h263',
  h264: 'video/h264',
  m4s: 'video/iso.segment',
  jpgv: 'video/jpeg',
  jpgm: 'image/jpm',
  mj2: 'video/mj2',
  mjp2: 'video/mj2',
  ts: 'video/mp2t',
  mp4: 'video/mp4',
  mp4v: 'video/mp4',
  mpg4: 'video/mp4',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  mpe: 'video/mpeg',
  m1v: 'video/mpeg',
  m2v: 'video/mpeg',
  ogv: 'video/ogg',
  qt: 'video/quicktime',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

import { readdirSync, statSync } from 'node:fs';
// node_modules/totalist/sync/index.mjs
import { join, resolve } from 'node:path';
function totalist(_dir, callback, pre = '') {
  const dir = resolve('.', _dir);
  const arr = readdirSync(dir);
  let abs;
  let stats;
  for (let i = 0; i < arr.length; i++) {
    abs = join(dir, arr[i]);
    stats = statSync(abs);
    stats.isDirectory()
      ? totalist(abs, callback, join(pre, arr[i]))
      : callback(join(pre, arr[i]), abs, stats);
  }
}

// src/sirv.js
const toAssume = (_uri, extns) => {
  let uri = _uri;
  let x;
  const len = uri.length - 1;
  if (uri.charCodeAt(len) === 47) {
    uri = uri.substring(0, len);
  }
  const arr = [];
  const tmp = `${uri}/index`;
  for (let i = 0; i < extns.length; i++) {
    x = extns[i] ? `.${extns[i]}` : '';
    if (uri) arr.push(uri + x);
    arr.push(tmp + x);
  }
  return arr;
};
const viaCache = (cache, uri, extns) => {
  let data;
  const arr = toAssume(uri, extns);
  for (let i = 0; i < arr.length; i++) {
    if (data === cache[arr[i]]) return data;
  }
};
const viaLocal = (dir, isEtag, uri, extns) => {
  let i = 0;
  const arr = toAssume(uri, extns);
  let abs;
  let stats;
  let name;
  let headers;
  for (; i < arr.length; i++) {
    abs = normalize(join2(dir, arr[i]));
    if (abs.startsWith(dir) && existsSync(abs)) {
      stats = statSync2(abs);
      if (stats.isDirectory()) continue;
      headers = toHeaders(name, stats, isEtag);
      headers.set('Cache-Control', isEtag ? 'no-cache' : 'no-store');
      return { abs, stats, headers };
    }
  }
};
const is404 = () => {
  return new Response(null, {
    status: 404,
    statusText: '404',
  });
};
const send = (req, data) => {
  let code = 200;
  const opts = {};
  if (req.headers.has('range')) {
    code = 206;
    const [x, y] = req.headers.get('range').replace('bytes=', '').split('-');

    opts.end = Number.parseInt(y, 10) || data.stats.size - 1;
    const end = opts.end;
    opts.start = Number.parseInt(x, 10) || 0;
    const start = opts.start;

    if (start >= data.stats.size || end >= data.stats.size) {
      data.headers.set('Content-Range', `bytes */${data.stats.size}`);
      return new Response(null, {
        headers: data.headers,
        status: 416,
      });
    }
    data.headers.set('Content-Range', `bytes ${start}-${end}/${data.stats.size}`);
    data.headers.set('Content-Length', end - start + 1);
    data.headers.set('Accept-Ranges', 'bytes');
    opts.range = true;
  }
  if (opts.range) {
    return new Response(Bun.file(data.abs).slice(opts.start, opts.end), {
      headers: data.headers,
      status: code,
    });
  }
  return new Response(Bun.file(data.abs), {
    headers: data.headers,
    status: code,
  });
};
const toHeaders = (name, stats, isEtag) => {
  const enc = ENCODING[name.slice(-3)];
  let ctype = lookup(name.slice(0, enc && -3)) || '';
  if (ctype === 'text/html') ctype += ';charset=utf-8';
  const headers = new Headers({
    'Content-Length': stats.size,
    'Content-Type': ctype,
    'Last-Modified': stats.mtime.toUTCString(),
  });
  if (enc) headers.set('Content-Encoding', enc);
  if (isEtag) headers.set('ETag', `W/"${stats.size}-${stats.mtime.getTime()}"`);
  return headers;
};
/*! MIT © Luke Edwards https://github.com/lukeed/sirv/blob/master/packages/sirv/index.js */
const ENCODING = {
  '.br': 'br',
  '.gz': 'gzip',
};
for (const mime in mimedefault) {
  mimes[mime] = mimedefault[mime];
}
function sirv_default(_dir, opts = {}) {
  let dir = _dir;
  dir = resolve2(dir || '.');
  const isNotFound = opts.onNoMatch || is404;
  const setHeaders = opts.setHeaders || false;
  const extensions = opts.extensions || ['html', 'htm'];
  const gzips = opts.gzip && extensions.map(x => `${x}.gz`).concat('gz');
  const brots = opts.brotli && extensions.map(x => `${x}.br`).concat('br');
  const FILES = {};
  const isEtag = !!opts.etag;
  const ignores = [];
  if (opts.ignores !== false) {
    ignores.push(/[/]([A-Za-z\s\d~$._-]+\.\w+){1,}$/);
    if (opts.dotfiles) ignores.push(/\/\.\w/);
    else ignores.push(/\/\.well-known/);
    if (Symbol.iterator in Object(opts.ignores)) {
      for (const x of opts.ignores) {
        ignores.push(new RegExp(x, 'i'));
      }
    }
    // [].concat(opts.ignores || []).forEach((x) => {
    //   ignores.push(new RegExp(x, "i"));
    // });
  }
  let cc = opts.maxAge != null && `public,max-age=${opts.maxAge}`;
  if (cc && opts.immutable) cc += ',immutable';
  else if (cc && opts.maxAge === 0) cc += ',must-revalidate';
  if (!opts.dev) {
    totalist(dir, (name, abs, stats) => {
      if (/\.well-known[\\+\/]/.test(name)) {
      } else if (!opts.dotfiles && /(^\.|[\\+|\/+]\.)/.test(name)) return;
      const headers = toHeaders(name, stats, isEtag);
      if (cc) headers.set('Cache-Control', cc);
      FILES[`/${name.normalize().replace(/\\+/g, '/')}`] = { abs, stats, headers };
    });
  }
  const lookup2 = opts.dev ? viaLocal.bind(0, dir, isEtag) : viaCache.bind(0, FILES);
  return (req, next) => {
    const extns = [''];
    let pathname = new URL(req.url).pathname;
    const val = req.headers.get('accept-encoding') || '';
    if (gzips && val.includes('gzip')) extns.unshift(...gzips);
    if (brots && /(br|brotli)/i.test(val)) extns.unshift(...brots);
    extns.push(...extensions);
    if (pathname.indexOf('%') !== -1) {
      try {
        pathname = decodeURIComponent(pathname);
      } catch (err) { }
    }
    let data = lookup2(pathname, extns);
    if (!data) return next ? next() : isNotFound(req);
    if (isEtag && req.headers.get('if-none-match') === data.headers.get('ETag')) {
      return new Response(null, { status: 304 });
    }
    data = {
      ...data,
      headers: new Headers(data.headers),
    };
    if (gzips || brots) {
      data.headers.append('Vary', 'Accept-Encoding');
    }
    if (setHeaders) {
      data.headers = setHeaders(data.headers, pathname, data.stats);
    }
    return send(req, data);
  };
}

// src/handler.js
import { existsSync as existsSync2 } from 'node:fs';

// src/polyfills.js
const globals = {};
function installPolyfills() {
  for (const name in globals) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    if (descriptor && !descriptor.configurable) {
      continue;
    }
    Object.defineProperty(globalThis, name, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: globals[name],
    });
  }
}

// src/handler.js
const serve = (path2, client = false) => {
  return (
    existsSync2(path2) &&
    sirv_default(path2, {
      etag: true,
      gzip: true,
      brotli: true,
      setHeaders:
        client &&
        ((headers, pathname) => {
          if (pathname.startsWith(`/${manifest.appDir}/immutable/`)) {
            headers.set('cache-control', 'public,max-age=31536000,immutable');
          }
          return headers;
        }),
    })
  );
};

const server = new Server(manifest);

await server.init({ env: (Bun || process).env });

const ssr = request => {
  if (origin) {
    const requestOrigin = get_origin(request.headers);
    if (origin !== requestOrigin) {
      const url = request.url.slice(request.url.split('/', 3).join('/').length);
      request = new Request(origin + url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        referrer: request.referrer,
        referrerPolicy: request.referrerPolicy,
        mode: request.mode,
        credentials: request.credentials,
        cache: request.cache,
        redirect: request.redirect,
        integrity: request.integrity,
      });
    }
  }
  if (address_header && !request.headers.has(address_header)) {
    throw new Error(
      `Address header was specified with ${`${ENV_PREFIX}ADDRESS_HEADER`}=${address_header} but is absent from request`,
    );
  }
  return server.respond(request, {
    getClientAddress() {
      if (address_header) {
        const value = request.headers.get(address_header) || '';
        if (address_header === 'x-forwarded-for') {
          const addresses = value.split(',');
          if (xff_depth < 1) {
            throw new Error(`${`${ENV_PREFIX}XFF_DEPTH`} must be a positive integer`);
          }
          if (xff_depth > addresses.length) {
            throw new Error(
              `${`${ENV_PREFIX}XFF_DEPTH`} is ${xff_depth}, but only found ${addresses.length} addresses`,
            );
          }
          return addresses[addresses.length - xff_depth].trim();
        }
        return value;
      }
      return '127.0.0.1';
    },
    platform: {
      isBun() {
        return true;
      },
    },
  });
};
const get_origin = headers => {
  const protocol = (protocol_header && headers.get(protocol_header)) || 'https';
  const host = headers.get(host_header);
  return `${protocol}://${host}`;
};
const __dirname2 = path.dirname(fileURLToPath(new URL(import.meta.url)));
installPolyfills();

const xff_depth = Number.parseInt(env('XFF_DEPTH', buildOptions.xff_depth ?? 1));
const origin = env('ORIGIN', undefined);
const address_header = env('ADDRESS_HEADER', '').toLowerCase();
const protocol_header = env('PROTOCOL_HEADER', '').toLowerCase();
const host_header = env('HOST_HEADER', 'host').toLowerCase();

async function handler_default(assets) {
  // const defaultAcceptWebsocket = (request, upgrade) => upgrade(request);

  const handlers = [
    assets && serve(path.join(__dirname2, '/client'), true),
    assets && serve(path.join(__dirname2, '/prerendered')),
    ssr,
  ].filter(Boolean);
  function handler(req) {
    function handle(i) {
      return handlers[i](req, () => {
        if (i < handlers.length) {
          return handle(i + 1);
        }
        return new Response(404, { status: 404 });
      });
    }
    return handle(0);
  }

  return {
    fetch: (req, srv) => {
      if (
        req.headers.get('connection')?.toLowerCase().includes('upgrade') &&
        req.headers.get('upgrade')?.toLowerCase() === 'websocket'
      ) {
        server.upgrade(req, {
          data: {
            url: req.url,
          },
        });
        // return;
      }
      return handler(req, srv);
    },
    websocket: buildOptions?.websockets,
  };
}
export { handler_default as default };

export { buildOptions, env };
