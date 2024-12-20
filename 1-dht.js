/* eslint-disable no-console */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { bootstrap } from '@libp2p/bootstrap'
import { identify } from '@libp2p/identify'
import { kadDHT, removePublicAddressesMapper } from '@libp2p/kad-dht'
import { tcp } from '@libp2p/tcp'
import { createLibp2p } from 'libp2p'
import bootstrappers from './bootstrappers.js'
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { mdns } from '@libp2p/mdns'
import { autoNAT } from '@libp2p/autonat'
import { circuitRelayServer } from '@libp2p/circuit-relay-v2'
import { multiaddr } from '@multiformats/multiaddr'

const node = await createLibp2p({
  addresses: {
    listen: ['/ip4/0.0.0.0/tcp/0']
  },
  transports: [tcp()],
  streamMuxers: [yamux()],
  connectionEncrypters: [noise()],
  peerDiscovery: [
    bootstrap({
      list: bootstrappers
    }),
    pubsubPeerDiscovery({
      interval: 1000
    }),
    mdns({
      interval: 100
    })
  ],
  services: {
    kadDHT: kadDHT({
      protocol: '/fantv/cdn/1.0.0',
      peerInfoMapper: removePublicAddressesMapper,
      clientMode: false
    }),
    identify: identify(),
    pubsub: gossipsub(),
    autoNat: autoNAT(),
    relay: circuitRelayServer(),
  }
})


console.log('Local Node started with id:', node.peerId.toString())
console.log('Local Multiaddrs: ', node.getMultiaddrs())

node.addEventListener('peer:connect', (evt) => {
  const peerId = evt.detail
  console.log('Connection established to:', peerId.toString()) // Emitted when a peer has been found
})

node.addEventListener('peer:discovery', (evt) => {
  const peerInfo = evt.detail
  const discoveredPeerId = peerInfo.id.toString()

  // filter out private ip addresses


  // get the multiaddr of peerInfo
  let bootPeer = peerInfo.multiaddrs[0].toString();
  const checkIfBootstrapper = bootstrappers.includes(bootPeer);
  if (checkIfBootstrapper) {
    console.log('Discovered bootstrapper:', bootPeer);
    return;
  }

  console.log('Discovered peer:', discoveredPeerId)
  let ma = peerInfo.multiaddrs[1].toString();
  console.log('Connecting to discovered peer:', ma);
  
  if (!ma.includes('p2p')) {
    ma = ma + '/p2p/' + peerInfo.id.toString();
    console.log('Connecting to discovered peer:', ma);
    node.dial(multiaddr(ma))
  }
})
