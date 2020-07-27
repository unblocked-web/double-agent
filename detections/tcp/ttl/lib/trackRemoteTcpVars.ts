import pcap from 'pcap';
import { EventEmitter } from 'events';
import * as os from 'os';

let device = process.env.NETWORK_DEVICE ?? 'lo0';
if (os.platform() === 'linux') device = 'eth0';

const isDebug = !!process.env.DEBUG;

export default function trackRemoteTcpVars(port: string | number, securePort: string | number) {
  const packets: {
    [source: string]: {
      windowSize: number;
      ttl: number;
    };
  } = {};

  const emitter = new EventEmitter();
  let pcapSession: pcap.PcapSession;
  let hasError;
  try {
    const tcpTracker = new pcap.TCPTracker();
    // @ts-ignore
    pcapSession = new pcap.PcapSession(
      true,
      device,
      `ip proto \\tcp and (tcp port ${port || 80} || tcp port ${securePort || 443})`,
    ); //, null, null, 'pcap.pcap');

    if (isDebug) {
      tcpTracker.on('session', function(session) {
        console.log('Start of session between ' + session.src_name + ' and ' + session.dst_name);
      });

      tcpTracker.on('end', function(session) {
        console.log('End of TCP session between ' + session.src_name + ' and ' + session.dst_name);
      });
    }

    pcapSession.on('packet', function(raw_packet) {
      const packet = pcap.decode.packet(raw_packet);
      const ethPayload = packet.payload;
      const ipv4 = ethPayload.payload;
      const tcpPayload = ipv4.payload;
      if (!tcpPayload || !ipv4) return;
      const addr = ipv4.saddr + ':' + tcpPayload.sport;
      if (!packets[addr]) {
        packets[addr] = {
          ttl: ipv4.ttl,
          windowSize: tcpPayload.windowSize,
        };
        emitter.emit(addr, packets[addr]);
      }
      tcpTracker.track_packet(packet);
    });
  } catch (err) {
    hasError = true;
    console.log(err);

  }

  async function getPacket(addr: string) {
    let packet = packets[addr];
    if (!packet) {
      packet = await new Promise(resolve => {
        emitter.once(addr, resolve);
      });
    }

    return packet;
  }
  return {
    hasError,
    getPacket,
    stop: () => {
      pcapSession.close();
    },
  };
}
