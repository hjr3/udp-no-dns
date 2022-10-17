import dgram from 'node:dgram';
import { Buffer } from 'node:buffer';
import util from 'util';

import dns from 'node:dns';
import { lookup } from 'node:dns/promises';

const originalLookup = dns.lookup;
dns.lookup = (...args) => {
  console.log('called dns.lookup');
  originalLookup(...args);
};

const host = 'www.example.com';
const ip = await lookup(host);

const socket = dgram.createSocket('udp4');
socket.send2 = util.promisify(socket.send);

const msg = Buffer.from('foo');

await socket.send2(msg, 0, msg.length, 8125, ip.address);
console.log('msg 1 sent');
await socket.send2(msg, 0, msg.length, 8125, ip.address);
console.log('msg 2 sent');

socket.close();
