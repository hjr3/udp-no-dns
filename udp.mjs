import dgram from 'node:dgram';
import { Buffer } from 'node:buffer';
import util from 'util';

import dns from 'dns';
import { resolve4 } from 'node:dns/promises';

const host = 'www.example.com';
// note: resolve4 will not work with IP addresses nor will it work with values like 'localhost'
const ipAddresses = await resolve4(host, { ttl: true });

const { address, ttl } = ipAddresses.pop();

let cacheIpAddr = address;
let cacheTtl = ttl * 1000; // store ttl in ms
let cacheTimestamp = Date.now();
let resolveLock = false;
const socket = dgram.createSocket({
  type: 'udp4',
  lookup: (hostname, options, callback) => {
    if (hostname === host) {
      const now = Date.now();
      if (
        resolveLock === false &&
        (now - cacheTimestamp > cacheTtl)
      ) {
        resolveLock = true;
        console.log('lazily refreshing ip address...');
        dns.resolve4(hostname, { ttl: true }, (err, addresses) => {
          resolveLock = false;
          if (err) {
            console.error(err);
            return;
          }

          cacheIpAddr = addresses[0].address;
          cacheTtl = addresses[0].ttl * 1000;

          console.log('cache updated', { cacheIpAddr, cacheTtl });

          // intentionally do not call the callback
        });
      }

      callback(null, address, 4);
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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// note: www.example.com has a _very_ long ttl
await delay(cacheTtl);
await socket.send2(msg, 0, msg.length, 8125, host);
console.log('msg 4 sent');

socket.close();
