import dgram from 'node:dgram';
import { Buffer } from 'node:buffer';
import util from 'util';

import dns from 'dns';
import { lookup } from 'node:dns/promises';

const host = 'www.example.com';
const ip = await lookup(host);

const socket = dgram.createSocket({
  type: 'udp4',
  lookup: (hostname, options, callback) => {
    if (hostname === host) {
      callback(null, ip.address, ip.family);
      return;
    }

    console.log('calling dns.lookup', { hostname });
    dns.lookup(hostname, options, callback);
  },
});
socket.send2 = util.promisify(socket.send);

const msg = Buffer.from('foo');

await socket.send2(msg, 0, msg.length, 8125, host);
console.log('msg 1 sent');
await socket.send2(msg, 0, msg.length, 8125, host);
console.log('msg 2 sent');
await socket.send2(msg, 0, msg.length, 8125, 'example.net');
console.log('msg 3 sent');

socket.close();
