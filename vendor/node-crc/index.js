'use strict';

// Minimal pure-JS stand-in for the `node-crc` package's `crc()` function.
// The real `node-crc` is a native Rust module requiring a Rust toolchain to build, which isn't
// available in every environment this bot runs in. prism-media only ever calls it one way —
// `crc(32, false, 0x04c11db7, 0, 0, 0, 0, 0, buffer)` — to compute the CRC32 checksums used in
// Ogg page framing (https://www.xiph.org/ogg/doc/framing.html: width 32, unreflected,
// polynomial 0x04c11db7, initial value 0, no final XOR). This shim implements exactly that case.

const TABLE = (() => {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let r = i << 24;
		for (let j = 0; j < 8; j++) {
			r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
		}
		table[i] = r >>> 0;
	}
	return table;
})();

function crc32Ogg(buffer) {
	let value = 0;
	for (let i = 0; i < buffer.length; i++) {
		value = ((value << 8) ^ TABLE[((value >>> 24) ^ buffer[i]) & 0xff]) >>> 0;
	}
	return value;
}

function crc(width, reflectIn, poly, initialValue, reflectOut, xorOut, ...rest) {
	const buffer = rest[rest.length - 1];

	if (width !== 32 || reflectIn || poly !== 0x04c11db7 || initialValue !== 0 || reflectOut || xorOut !== 0) {
		throw new Error('This node-crc shim only supports the Ogg CRC32 parameters (32, false, 0x04c11db7, 0, 0, 0)');
	}
	if (!Buffer.isBuffer(buffer)) {
		throw new TypeError('crc() expects a Buffer as its final argument');
	}

	const out = Buffer.alloc(4);
	out.writeUInt32BE(crc32Ogg(buffer), 0);
	return out;
}

module.exports = { crc };
